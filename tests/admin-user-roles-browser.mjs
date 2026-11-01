import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.LAUNCHO_PLAYWRIGHT_PATH || "playwright",
);
const databaseName = `launchox_user_roles_${randomUUID().replaceAll("-", "")}`;
const uri = `mongodb://127.0.0.1:27017/${databaseName}`;
const base = "http://localhost:3025";
let server;
let browser;
let output = "";
try {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const passwordHash = await bcrypt.hash("Browser123!", 12);
  const records = await db.collection("users").insertMany(
    [
      {
        name: "مدیر فروشگاه",
        email: "admin@example.com",
        role: "admin",
        createdAt: new Date("2020-01-01"),
      },
      {
        name: "ادمین دوم",
        email: "second@example.com",
        role: "admin",
        createdAt: new Date("2021-01-01"),
      },
      {
        name: "سپهر موسوی",
        email: "customer@example.com",
        role: "customer",
        createdAt: new Date(),
      },
      {
        name: "مشتری نمونه",
        email: "sample@example.com",
        role: "customer",
        createdAt: new Date(),
      },
    ].map((record) => ({
      ...record,
      passwordHash,
      isActive: true,
      addresses: [],
      updatedAt: new Date(),
    })),
  );
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", "3025"],
    {
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "production",
        MONGODB_URI: uri,
        AUTH_SECRET: randomUUID(),
        AUTH_URL: base,
        NEXT_PUBLIC_SITE_URL: base,
        NEXT_PUBLIC_SITE_NAME: "لانچ‌اوکس",
        PAYMENT_PROVIDER: "fake",
        SHIPPING_FLAT_FEE: "0",
        FREE_SHIPPING_THRESHOLD: "0",
      },
    },
  );
  server.stdout.on("data", (chunk) => {
    output += chunk;
  });
  server.stderr.on("data", (chunk) => {
    output += chunk;
  });
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error(output);
    try {
      if ((await fetch(`${base}/api/health`)).ok) break;
    } catch {
      /* Wait for the isolated server. */
    }
    await delay(1000);
  }
  browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const errors = [];
  async function login(email) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      extraHTTPHeaders: {
        "x-forwarded-for": `127.${Math.floor(Math.random() * 200) + 1}.1.1`,
      },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/login?callbackUrl=/admin/users`);
    await page.getByLabel("ایمیل", { exact: true }).fill(email);
    await page.getByLabel("رمز عبور", { exact: true }).fill("Browser123!");
    await page.getByRole("button", { name: "ورود", exact: true }).click();
    await page.waitForURL(`${base}/admin/users`);
    return page;
  }
  const page = await login("admin@example.com");
  await page.locator("tbody tr").first().waitFor();
  const secondPage = await login("second@example.com");
  await secondPage.locator("tbody tr").first().waitFor();
  const customerPage = await login("customer@example.com");
  await customerPage
    .getByText("صفحه یا مورد موردنظر پیدا نشد", { exact: false })
    .first()
    .waitFor();
  const row = (email) => page.locator("tbody tr").filter({ hasText: email });
  assert.equal(
    await row("admin@example.com").getByRole("combobox").isDisabled(),
    true,
  );
  assert.equal(
    await row("admin@example.com").getByRole("switch").isDisabled(),
    true,
  );
  assert.deepEqual(
    await page
      .locator('tbody select[name="role"]')
      .evaluateAll((elements) => elements.map((element) => element.value)),
    ["admin", "admin", "customer", "customer"],
  );
  for (const width of [1440, 1024, 768, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    if (width === 1440) {
      const aligned = await page.locator("table").evaluate((table) => {
        const heading = table.querySelectorAll("th")[1];
        const title = document.createRange();
        title.selectNodeContents(heading);
        const expected = title.getBoundingClientRect().right;
        return [...table.querySelectorAll(".admin-user-email")].every(
          (email) => {
            const content = document.createRange();
            content.selectNodeContents(email);
            return (
              Math.abs(content.getBoundingClientRect().right - expected) <= 2
            );
          },
        );
      });
      assert.ok(
        aligned,
        "Email text should align with the RTL email column heading",
      );
    }
    if (width === 1440 || width === 360)
      await page.screenshot({
        path: `docs/admin-review/users-roles-${width === 1440 ? "desktop" : "mobile"}.png`,
        fullPage: true,
      });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await row("customer@example.com").getByRole("combobox").selectOption("admin");
  page.once("dialog", (dialog) => dialog.dismiss());
  await row("customer@example.com")
    .getByRole("button", { name: "ذخیره نقش سپهر موسوی", exact: true })
    .click();
  assert.equal(
    (await db.collection("users").findOne({ _id: records.insertedIds[2] }))
      .role,
    "customer",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await row("customer@example.com")
    .getByRole("button", { name: "ذخیره نقش سپهر موسوی", exact: true })
    .click();
  await row("customer@example.com").getByRole("status").waitFor();
  await delay(100);
  assert.equal(
    await row("customer@example.com").getByRole("combobox").inputValue(),
    "admin",
  );
  assert.equal(
    (await db.collection("users").findOne({ _id: records.insertedIds[2] }))
      .role,
    "admin",
  );
  assert.ok(
    (await page.locator("tbody tr").first().textContent()).includes(
      "customer@example.com",
    ),
  );
  await customerPage.goto(`${base}/admin/users`);
  await customerPage
    .getByRole("heading", { name: "مدیریت کاربران", exact: true })
    .waitFor();
  await secondPage
    .getByLabel("جستجوی کاربر", { exact: true })
    .fill("customer@example.com");
  await secondPage.waitForURL(
    (url) => url.searchParams.get("q") === "customer@example.com",
  );
  await secondPage.waitForFunction(
    () =>
      document.querySelector('select[aria-label="نقش کاربر سپهر موسوی"]')
        ?.value === "admin",
  );
  await secondPage.getByLabel("جستجوی کاربر", { exact: true }).fill("");
  await secondPage.waitForURL(`${base}/admin/users`);
  await row("customer@example.com")
    .getByRole("combobox")
    .selectOption("customer");
  page.once("dialog", (dialog) => dialog.accept());
  await row("customer@example.com")
    .getByRole("button", { name: "ذخیره نقش سپهر موسوی", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector('button[aria-label="ذخیره نقش سپهر موسوی"]')
        ?.disabled &&
      document
        .querySelector('select[aria-label="نقش کاربر سپهر موسوی"]')
        ?.closest("form")
        ?.getAttribute("aria-busy") === "false",
  );
  await page
    .getByLabel("جستجوی کاربر", { exact: true })
    .fill("sample@example.com");
  await page.waitForURL(
    (url) => url.searchParams.get("q") === "sample@example.com",
  );
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr").length === 1,
  );
  assert.ok(
    (await page.locator("tbody").textContent()).includes("sample@example.com"),
  );
  await page.getByLabel("جستجوی کاربر", { exact: true }).fill("");
  await page.waitForURL(`${base}/admin/users`);
  await row("second@example.com")
    .getByRole("combobox")
    .selectOption("customer");
  page.once("dialog", (dialog) => dialog.accept());
  await row("second@example.com")
    .getByRole("button", { name: "ذخیره نقش ادمین دوم", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector('button[aria-label="ذخیره نقش ادمین دوم"]')
        ?.disabled &&
      document
        .querySelector('select[aria-label="نقش کاربر ادمین دوم"]')
        ?.closest("form")
        ?.getAttribute("aria-busy") === "false",
  );
  const staleRow = secondPage
    .locator("tbody tr")
    .filter({ hasText: "sample@example.com" });
  await staleRow.getByRole("combobox").selectOption("admin");
  secondPage.once("dialog", (dialog) => dialog.accept());
  await staleRow
    .getByRole("button", { name: "ذخیره نقش مشتری نمونه", exact: true })
    .click();
  await secondPage
    .getByText("صفحه یا مورد موردنظر پیدا نشد", { exact: false })
    .first()
    .waitFor();
  assert.equal(
    (await db.collection("users").findOne({ _id: records.insertedIds[3] }))
      .role,
    "customer",
  );
  await page.reload();
  await page.locator("tbody tr").first().waitFor();
  assert.ok(
    (await page.locator("tbody tr").first().textContent()).includes(
      "admin@example.com",
    ),
  );
  for (const id of Object.values(records.insertedIds)) {
    const record = await db.collection("users").findOne({ _id: id });
    assert.equal(record.passwordHash, passwordHash);
    assert.equal(record.isActive, true);
    assert.deepEqual(record.addresses, []);
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: emails align with their heading, administrators sort first, confirmed role promotion/demotion persists and reorders rows, self controls disabled, live search and mobile overflow checked, promoted sessions gain access and demoted stale sessions cannot mutate, unrelated user fields preserved. Two screenshots saved.",
  );
} catch (error) {
  console.error(output.slice(-3500));
  throw error;
} finally {
  await browser?.close();
  server?.kill();
  if (mongoose.connection.db?.databaseName === databaseName)
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
