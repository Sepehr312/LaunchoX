import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Reuse the QA browser installation without adding an application dependency.
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.LAUNCHO_PLAYWRIGHT_PATH || "playwright",
);
const databaseName = `launchox_approved_ui_${randomUUID().replaceAll("-", "")}`;
const uri = `mongodb://127.0.0.1:27017/${databaseName}`;
const base = "http://localhost:3023";
let server;
let browser;
let output = "";
try {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const now = new Date();
  const user = (
    await db.collection("users").insertOne({
      name: "مدیر آزمایشی",
      email: "admin@example.com",
      passwordHash: await bcrypt.hash("Browser123!", 12),
      role: "admin",
      isActive: true,
      addresses: [],
      createdAt: now,
      updatedAt: now,
    })
  ).insertedId;
  const category = (
    await db.collection("categories").insertOne({
      name: "سایدبای‌ساید",
      slug: "approved-category",
      isActive: true,
      order: 0,
    })
  ).insertedId;
  const brand = (
    await db.collection("brands").insertOne({
      name: "سامسونگ",
      slug: "approved-brand",
      isActive: true,
      order: 0,
    })
  ).insertedId;
  const names = [
    "یخچال سایدبای‌ساید X900",
    "یخچال سایدبای‌ساید S780",
    "یخچال فریزر دوقلو",
    "یخچال فریزر بالا",
    "یخچال کمبی",
    "یخچال مینی",
  ];
  const images = [
    "side-by-side",
    "side-by-side",
    "twin",
    "top-freezer",
    "combi",
    "mini",
  ];
  const products = await db.collection("products").insertMany(
    Array.from({ length: 14 }, (_, i) => ({
      title: i < 6 ? names[i] : `یخچال نمونه مدل ${i}`,
      slug: `approved-product-${i}`,
      description: "محصول آزمایشی برای بررسی رابط کاربری",
      price: 89000000 - i * 1000000,
      stock: i === 0 ? 0 : i === 1 ? 2 : i === 2 ? 3 : 12,
      isActive: i !== 0,
      isFeatured: false,
      soldCount: 0,
      category,
      ...(i === 0 ? { brand } : {}),
      attributes:
        i === 0
          ? [{ key: "برند", value: "نام قدیمی" }]
          : i === 1
            ? [{ key: "برند", value: "ال‌جی" }]
            : [],
      images: [`/images/preview/categories/${images[i % 6]}.png`],
      createdAt: new Date(now.getTime() - i * 1000),
      updatedAt: now,
    })),
  );
  await db.collection("orders").insertMany(
    Array.from({ length: 11 }, (_, i) => ({
      orderNumber: `LX-${100124 - i}`,
      user,
      shippingAddress: {
        recipientName: ["علی محمدی", "سارا حسینی", "مهدی کریمی"][i % 3],
      },
      items: [],
      total: 24800000 - i * 100000,
      status: ["processing", "shipped", "pending"][i % 3],
      payment: {
        status: i % 3 === 2 ? "unpaid" : "paid",
        ...(i % 3 === 2 ? {} : { paidAt: now }),
      },
      createdAt: new Date(now.getTime() - i * 1000),
      updatedAt: now,
    })),
  );
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", "3023"],
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
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error(output);
    try {
      if ((await fetch(`${base}/api/health`)).ok) break;
    } catch {
      /* Wait for the isolated server to listen. */
    }
    await delay(1000);
  }
  browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/admin`);
  assert.ok(page.url().includes("/login"));
  await page.getByLabel("ایمیل", { exact: true }).fill("admin@example.com");
  await page.getByLabel("رمز عبور", { exact: true }).fill("Browser123!");
  await page.getByRole("button", { name: "ورود", exact: true }).click();
  await page.waitForURL(`${base}/admin`);
  await page.locator(".admin-orders-table tbody tr").first().waitFor();
  assert.equal(await page.locator(".admin-orders-table tbody tr").count(), 10);
  assert.equal(await page.locator(".admin-stock-list li").count(), 3);
  assert.ok(
    (await page.locator(".admin-orders-table .admin-badge-success").count()) >
      0,
  );
  assert.equal(
    await page.locator(".admin-stock-list .admin-badge-danger").count(),
    1,
  );
  assert.equal(await page.getByText("LX-۱۰۰۱۱۴", { exact: true }).count(), 0);
  async function inspect(path, name) {
    await page.goto(base + path);
    await page
      .locator(
        name === "dashboard" ? ".admin-overview" : ".admin-products-page",
      )
      .waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() =>
      Array.from(document.images).every((image) => image.complete),
    );
    for (const width of [1440, 1024, 768, 360]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${name}: page overflow at ${width}`,
      );
      assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
      if (width === 1440 || width === 360)
        await page.screenshot({
          path: `docs/admin-review/${name}-approved-${width === 1440 ? "desktop" : "mobile"}.png`,
          fullPage: true,
        });
    }
  }
  await inspect("/admin", "dashboard");
  await inspect("/admin/products", "products");
  assert.deepEqual(await page.locator("thead th").allTextContents(), [
    "تصویر",
    "عنوان",
    "برند",
    "دسته",
    "قیمت",
    "موجودی",
    "وضعیت",
    "عملیات",
  ]);
  const first = page.locator("tbody tr").first();
  assert.equal(
    (await first.locator("td").nth(2).textContent()).trim(),
    "سامسونگ",
  );
  assert.equal(
    (
      await page.locator("tbody tr").nth(1).locator("td").nth(2).textContent()
    ).trim(),
    "ال‌جی",
  );
  assert.equal(
    (
      await page.locator("tbody tr").nth(2).locator("td").nth(2).textContent()
    ).trim(),
    "بدون برند",
  );
  const scroll = page.getByRole("region", { name: "جدول محصولات" });
  assert.ok(await scroll.evaluate((e) => e.scrollWidth > e.clientWidth));
  await page.setViewportSize({ width: 1440, height: 1000 });
  const toggle = first.getByRole("switch");
  assert.equal(await toggle.getAttribute("aria-checked"), "false");
  await toggle.click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('tbody [role="switch"]')
        ?.getAttribute("aria-checked") === "true",
  );
  assert.equal(
    (await db.collection("products").findOne({ _id: products.insertedIds[0] }))
      .isActive,
    true,
  );
  await toggle.click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('tbody [role="switch"]')
        ?.getAttribute("aria-checked") === "false",
  );
  await page.getByRole("link", { name: "صفحه بعدی", exact: true }).click();
  await page.waitForURL(/page=2/);
  assert.equal(await page.locator("tbody tr").count(), 2);
  await page.getByLabel("جستجوی محصول", { exact: true }).fill("یخچال");
  await page.getByRole("button", { name: "جستجو", exact: true }).click();
  await page.waitForURL(
    (url) =>
      url.searchParams.get("q") === "یخچال" && !url.searchParams.has("page"),
  );
  await page.getByRole("link", { name: "صفحه بعدی", exact: true }).click();
  await page.waitForURL((url) => url.searchParams.get("page") === "2");
  assert.equal(new URL(page.url()).searchParams.get("q"), "یخچال");
  await page.getByLabel("جستجوی محصول", { exact: true }).fill("ناموجوددرجستجو");
  await page.getByRole("button", { name: "جستجو", exact: true }).click();
  await page
    .getByText(
      "محصولی با این عبارت جستجو پیدا نشد؛ عبارت دیگری را امتحان کنید.",
      { exact: true },
    )
    .waitFor();
  await page.getByRole("link", { name: "پاک کردن جستجو", exact: true }).click();
  await page.waitForURL(`${base}/admin/products`);
  const deleteButton = page
    .locator("tbody tr")
    .first()
    .getByRole("button", { name: /حذف محصول/ });
  page.once("dialog", (dialog) => dialog.dismiss());
  await deleteButton.click();
  assert.ok(
    await db.collection("products").findOne({ _id: products.insertedIds[0] }),
  );
  page.once("dialog", (dialog) => dialog.accept());
  await deleteButton.click();
  await page.waitForFunction(
    () => !document.querySelector('img[alt="یخچال سایدبای‌ساید X900"]'),
  );
  assert.equal(
    await db.collection("products").findOne({ _id: products.insertedIds[0] }),
    null,
  );
  await db.collection("orders").deleteMany({});
  await db.collection("products").deleteMany({});
  await page.goto(`${base}/admin`);
  await page.getByText("هنوز سفارشی ثبت نشده است.", { exact: true }).waitFor();
  await page
    .getByText("هیچ محصولی با موجودی کمتر از پنج واحد وجود ندارد.", {
      exact: true,
    })
    .waitFor();
  await page.goto(`${base}/admin/products`);
  await page
    .getByText(
      "محصولی در این صفحه برای نمایش وجود ندارد. برای افزودن محصول، «محصول جدید» را انتخاب کنید.",
      { exact: true },
    )
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: desktop/mobile layouts at 360/768/1024/1440, ten latest orders, low stock, real/legacy/missing brands, status toggles persisted, search, pagination with search preserved, deletion confirmation, guest guard and empty states. Four screenshots saved.",
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
