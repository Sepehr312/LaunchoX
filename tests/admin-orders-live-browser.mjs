import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { mkdir } from "node:fs/promises";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.LAUNCHO_PLAYWRIGHT_PATH || "playwright",
);
const databaseName = `launchox_orders_ui_${randomUUID().replaceAll("-", "")}`;
const base = "http://localhost:3024";
let server;
let browser;
let output = "";
try {
  await mongoose.connect(`mongodb://127.0.0.1:27017/${databaseName}`);
  const db = mongoose.connection.db;
  const now = new Date();
  const admin = (
    await db.collection("users").insertOne({
      name: "مدیر آزمایشی",
      email: "orders-admin@example.com",
      passwordHash: await bcrypt.hash("Browser123!", 12),
      role: "admin",
      isActive: true,
      addresses: [],
      createdAt: now,
      updatedAt: now,
    })
  ).insertedId;
  const sara = (
    await db
      .collection("users")
      .insertOne({
        name: "سارا حسینی",
        email: "sara@example.com",
        role: "customer",
      })
  ).insertedId;
  const ali = (
    await db
      .collection("users")
      .insertOne({
        name: "علی محمدی",
        email: "ali@example.com",
        role: "customer",
      })
  ).insertedId;
  await db.collection("orders").insertMany(
    Array.from({ length: 18 }, (_, i) => ({
      orderNumber: `LX-${100124 - i}`,
      user: i % 2 ? sara : ali,
      shippingAddress: { recipientName: i % 2 ? "سارا حسینی" : "علی محمدی" },
      items: [],
      subtotal: 42800000,
      shippingFee: 0,
      total: 42800000,
      status: ["processing", "shipped", "pending", "delivered", "cancelled"][
        i % 5
      ],
      payment: {
        status: i % 5 === 2 ? "unpaid" : i % 5 === 4 ? "failed" : "paid",
      },
      createdAt: new Date(now.getTime() - (i >= 10 ? 45 * 86400000 : i * 1000)),
      updatedAt: now,
    })),
  );
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", "3024"],
    {
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "production",
        MONGODB_URI: `mongodb://127.0.0.1:27017/${databaseName}`,
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
  for (let attempt = 0; attempt < 60; attempt++) {
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
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/admin/orders`);
  assert.ok(page.url().includes("/login"));
  await page
    .getByLabel("ایمیل", { exact: true })
    .fill("orders-admin@example.com");
  await page.getByLabel("رمز عبور", { exact: true }).fill("Browser123!");
  await page.getByRole("button", { name: "ورود", exact: true }).click();
  await page.waitForURL(`${base}/admin/orders`);
  await page
    .getByRole("heading", { name: "مدیریت سفارش‌ها", exact: true })
    .waitFor();
  assert.equal(await page.locator("tbody tr").count(), 12);
  assert.equal(
    await page.getByRole("button", { name: /اعمال|پاک/ }).count(),
    0,
  );
  assert.equal(await page.locator(".admin-stat-card").count(), 4);
  await page.evaluate(() => {
    window.ordersSentinel = "same-document";
  });
  const search = page.getByRole("searchbox");
  await search.fill("سارا");
  await page.waitForURL((url) => url.searchParams.get("q") === "سارا");
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr").length === 9,
  );
  assert.ok(
    await search.evaluate((element) => element === document.activeElement),
  );
  await page.getByLabel("وضعیت پرداخت", { exact: true }).selectOption("paid");
  await page.waitForURL((url) => url.searchParams.get("payment") === "paid");
  await page.getByRole("button", { name: /ارسال شده/ }).click();
  await page.waitForURL((url) => url.searchParams.get("status") === "shipped");
  assert.equal(new URL(page.url()).searchParams.get("q"), "سارا");
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr").length === 2,
  );
  await page.getByLabel("بازه زمانی", { exact: true }).selectOption("7");
  await page.waitForURL((url) => url.searchParams.get("period") === "7");
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr").length === 1,
  );
  await search.fill("سارا");
  await search.pressSequentially(" احمدی", { delay: 15 });
  await page.waitForURL((url) => url.searchParams.get("q") === "سارا احمدی");
  await page
    .getByText(
      "سفارشی با فیلترهای انتخاب‌شده پیدا نشد؛ جستجو یا فیلترها را تغییر دهید.",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await page.evaluate(() => window.ordersSentinel),
    "same-document",
  );
  await search.fill("");
  await page.waitForURL((url) => !url.searchParams.has("q"));
  assert.equal(new URL(page.url()).searchParams.get("payment"), "paid");
  await page.reload();
  assert.equal(
    await page.getByLabel("وضعیت پرداخت", { exact: true }).inputValue(),
    "paid",
  );
  assert.equal(
    await page.getByLabel("بازه زمانی", { exact: true }).inputValue(),
    "7",
  );
  await page.goto(`${base}/admin/orders?page=2`);
  await search.fill("LX-۱۰۰۱۲۴");
  await page.waitForURL(
    (url) => url.searchParams.has("q") && !url.searchParams.has("page"),
  );
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr").length === 1,
  );
  await page.goto(`${base}/admin/orders?q=%5B`);
  await page
    .getByText(
      "سفارشی با فیلترهای انتخاب‌شده پیدا نشد؛ جستجو یا فیلترها را تغییر دهید.",
      { exact: true },
    )
    .waitFor();
  await page.goto(`${base}/admin/orders?payment=invalid`);
  await page.locator("p[role=alert]").waitFor();
  await page.goto(`${base}/admin/orders`);
  await page.getByRole("link", { name: "صفحه ۲", exact: true }).click();
  await page.waitForURL((url) => url.searchParams.get("page") === "2");
  await page.goBack();
  await page.waitForURL((url) => !url.searchParams.has("page"));
  await mkdir("docs/admin-review", { recursive: true });
  for (const width of [1440, 1024, 768, 360]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => document.fonts.ready);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Page overflow at ${width}px`,
    );
    if (width === 1440 || width === 360)
      await page.screenshot({
        path: `docs/admin-review/orders-live-${width}.png`,
        fullPage: true,
      });
  }
  await db.collection("orders").deleteMany({});
  await page.reload();
  await page
    .getByText("سفارشی برای نمایش وجود ندارد.", { exact: true })
    .waitFor();
  assert.equal(await db.collection("users").countDocuments({ _id: admin }), 1);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: live search, combined filters, Persian references, debounce/focus, no reload or apply/reset buttons, pagination reset/history, reload persistence, invalid/empty results and 360/768/1024/1440px layouts; screenshots saved.",
  );
} catch (error) {
  console.error(output.slice(-3000));
  throw error;
} finally {
  await browser?.close();
  server?.kill();
  if (mongoose.connection.db?.databaseName === databaseName)
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
