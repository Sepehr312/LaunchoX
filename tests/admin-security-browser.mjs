import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";
import { startTestMongo } from "./mongo-server.ts";

const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.LAUNCHO_PLAYWRIGHT_PATH || "playwright",
);
const root = fileURLToPath(new URL("../", import.meta.url));
const screenshots = fileURLToPath(
  new URL("../docs/admin-review/", import.meta.url),
);
const port = 3047;
const base = `http://localhost:${port}`;
const secret = randomBytes(48).toString("hex");
let replica;
let server;
let browser;
let serverOutput = "";
try {
  replica = await startTestMongo(true);
  const uri = replica.uri;
  await mongoose.connect(uri);
  const users = mongoose.connection.db.collection("users");
  const password = "SecurityBrowser123!";
  const passwordHash = await bcrypt.hash(password, 12);
  const ids = await users.insertMany([
    {
      name: "مدیر آزمایشی",
      mobile: "09123456789",
      passwordHash,
      role: "admin",
      isActive: true,
      sessionVersion: 0,
      addresses: [],
    },
    {
      name: "مدیر تأییدشده",
      mobile: "09123456788",
      mobileVerifiedAt: new Date(),
      passwordHash,
      role: "admin",
      isActive: true,
      sessionVersion: 0,
      addresses: [],
    },
    { role: "customer", isActive: true, sessionVersion: 0, addresses: [] },
  ]);
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", String(port)],
    {
      cwd: root,
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "production",
        MONGODB_URI: uri,
        AUTH_SECRET: secret,
        AUTH_URL: base,
        NEXT_PUBLIC_SITE_URL: base,
        NEXT_PUBLIC_SITE_NAME: "لانچو ایکس",
        PAYMENT_PROVIDER: "fake",
        SHIPPING_FLAT_FEE: "0",
        FREE_SHIPPING_THRESHOLD: "0",
        SMS_IR_ENABLED: "false",
        SMS_IR_API_KEY: "",
      },
    },
  );
  server.stdout.on("data", (chunk) => (serverOutput += chunk));
  server.stderr.on("data", (chunk) => (serverOutput += chunk));
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try {
      if ((await fetch(`${base}/api/health`)).ok) {
        ready = true;
        break;
      }
    } catch {
      // The isolated production server is still starting.
    }
    await delay(1000);
  }
  assert.ok(ready, "Production server must become ready");
  browser = await chromium.launch({
    channel: process.env.LAUNCHO_BROWSER_CHANNEL || "msedge",
    headless: true,
  });
  async function contextFor(index, width = 1440) {
    const context = await browser.newContext({
      viewport: { width, height: 1100 },
    });
    if (index !== undefined) {
      const token = await encode({
        secret,
        salt: "authjs.session-token",
        maxAge: 600,
        token: {
          id: String(ids.insertedIds[index]),
          role: index === 2 ? "customer" : "admin",
          sessionVersion: 0,
        },
      });
      await context.addCookies([
        { name: "authjs.session-token", value: token, url: base },
      ]);
    }
    return context;
  }
  const guest = await contextFor();
  const guestPage = await guest.newPage();
  await guestPage.goto(`${base}/admin/security`);
  assert.equal(new URL(guestPage.url()).pathname, "/login");
  await guest.close();
  const customer = await contextFor(2);
  const customerPage = await customer.newPage();
  assert.equal(
    (await customerPage.goto(`${base}/admin/security`)).status(),
    404,
  );
  await customer.close();
  await mkdir(screenshots, { recursive: true });
  for (const width of [360, 768, 1024, 1440]) {
    const context = await contextFor(0, width);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/admin/security`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "امنیت حساب مدیر" }).waitFor();
    assert.equal(
      await page.getByLabel("شمارهٔ مدیر", { exact: true }).inputValue(),
      "۰۹۱۲۳۴۵۶۷۸۹",
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    const enrollment = await page
      .getByRole("region", { name: "شمارهٔ ورود", exact: true })
      .boundingBox();
    const passwordSection = page.getByRole("region", {
      name: "تغییر رمز عبور",
      exact: true,
    });
    const passwordRect = await passwordSection.boundingBox();
    if (width >= 1200) {
      assert.ok(Math.abs(enrollment.y - passwordRect.y) < 2);
      assert.ok(enrollment.x > passwordRect.x);
    } else assert.ok(passwordRect.y >= enrollment.y + enrollment.height);
    const save = passwordSection.getByRole("button", {
      name: "ذخیره رمز جدید",
    });
    assert.equal(
      await save.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
      "rgb(0, 106, 203)",
    );
    for (const field of [
      "رمز فعلی مدیر",
      "رمز عبور فعلی",
      "رمز عبور جدید",
      "تکرار رمز عبور جدید",
    ]) {
      const input = page.getByLabel(field, { exact: true });
      await input.fill("Draft123!");
      const eye = input.locator("..").getByRole("button");
      const rect = await eye.boundingBox();
      assert.ok(rect.width >= 44 && rect.height >= 44);
      assert.equal(
        await eye.evaluate((element) => element.closest("label") === null),
        true,
      );
      await eye.click();
      assert.equal(await input.getAttribute("type"), "text");
      await eye.focus();
      await page.keyboard.press("Space");
      assert.equal(await input.getAttribute("type"), "password");
      await input.fill("");
    }
    await passwordSection
      .getByLabel("رمز عبور فعلی", { exact: true })
      .fill(password);
    await passwordSection
      .getByLabel("رمز عبور جدید", { exact: true })
      .fill("short");
    await passwordSection
      .getByLabel("تکرار رمز عبور جدید", { exact: true })
      .fill("different");
    await save.click();
    assert.equal(
      await passwordSection
        .getByLabel("رمز عبور جدید", { exact: true })
        .getAttribute("aria-invalid"),
      "true",
    );
    assert.equal(
      await passwordSection
        .getByLabel("رمز عبور جدید", { exact: true })
        .inputValue(),
      "short",
    );
    await page.reload({ waitUntil: "networkidle" });
    if ([360, 1440].includes(width)) {
      await page.screenshot({
        path: `${screenshots}/security-approved-${width}.png`,
        fullPage: true,
      });
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  const verified = await contextFor(1, 360);
  const verifiedPage = await verified.newPage();
  await verifiedPage.goto(`${base}/admin/security`, {
    waitUntil: "networkidle",
  });
  assert.equal(
    await verifiedPage
      .getByText("نیازمند تأیید شماره", { exact: true })
      .count(),
    0,
  );
  await verifiedPage
    .getByRole("button", { name: "دریافت کد شمارهٔ فعلی", exact: true })
    .waitFor();
  await verifiedPage
    .getByText("هنوز رمز تعیین نکرده‌ام", { exact: true })
    .click();
  assert.equal(
    await verifiedPage
      .getByRole("button", { name: "دریافت کد شمارهٔ فعلی", exact: true })
      .count(),
    2,
  );
  assert.equal(
    await verifiedPage.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await verified.close();
  const admin = await contextFor(0);
  const page = await admin.newPage();
  await page.goto(`${base}/admin/security`, { waitUntil: "networkidle" });
  const passwordSection = page.getByRole("region", {
    name: "تغییر رمز عبور",
    exact: true,
  });
  await passwordSection
    .getByLabel("رمز عبور فعلی", { exact: true })
    .fill("WrongPassword123!");
  await passwordSection
    .getByLabel("رمز عبور جدید", { exact: true })
    .fill("NewSecurity123!");
  await passwordSection
    .getByLabel("تکرار رمز عبور جدید", { exact: true })
    .fill("NewSecurity123!");
  await passwordSection.getByRole("button", { name: "ذخیره رمز جدید" }).click();
  await passwordSection.getByRole("alert").waitFor();
  assert.equal(
    await passwordSection
      .getByLabel("رمز عبور جدید", { exact: true })
      .inputValue(),
    "NewSecurity123!",
  );
  await passwordSection
    .getByLabel("رمز عبور فعلی", { exact: true })
    .fill(password);
  await passwordSection.getByRole("button", { name: "ذخیره رمز جدید" }).click();
  await page.waitForURL((url) => url.pathname !== "/admin/security");
  const updated = await users.findOne({ _id: ids.insertedIds[0] });
  assert.ok(await bcrypt.compare("NewSecurity123!", updated.passwordHash));
  assert.equal(updated.sessionVersion, 1);
  const session = await (
    await admin.request.get(`${base}/api/auth/session`)
  ).json();
  assert.equal(session?.user, undefined);
  await page.goto(`${base}/admin/security`);
  assert.equal(new URL(page.url()).pathname, "/login");
  await admin.close();
  console.log(
    "PASS: security page at 360/768/1024/1440px, guest/customer access, password visibility, draft-preserving client/server errors, verified-number forms, password save and session revocation. No real SMS sent.",
  );
} finally {
  await browser?.close();
  if (server && server.exitCode === null) {
    server.kill();
    await new Promise((resolve) => server.once("exit", resolve));
  }
  await mongoose.disconnect();
  await replica?.stop();
}
