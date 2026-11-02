import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { startTestMongo } from "./mongo-server.ts";
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.LAUNCHO_PLAYWRIGHT_PATH || "playwright",
);
const mongo = await startTestMongo(true),
  dbName = "content_" + randomUUID().replaceAll("-", "");
const base = "http://localhost:3024";
let server, browser;
let output = "";
try {
  await mongoose.connect(mongo.uri, { dbName });
  const db = mongoose.connection.db;
  const password = "Browser123!";
  const hash = await bcrypt.hash(password, 12);
  await db.collection("users").insertMany([
    {
      name: "مدیر",
      email: "admin@example.com",
      passwordHash: hash,
      role: "admin",
      isActive: true,
    },
    {
      name: "مشتری",
      email: "customer@example.com",
      passwordHash: hash,
      role: "customer",
      isActive: true,
    },
  ]);
  const category = new mongoose.Types.ObjectId();
  const product = new mongoose.Types.ObjectId();
  await db
    .collection("categories")
    .insertOne({
      _id: category,
      name: "دسته آزمون",
      slug: "test-category",
      isActive: true,
    });
  await db
    .collection("products")
    .insertOne({
      _id: product,
      title: "محصول آزمون",
      slug: "test-product",
      description: "توضیح محصول",
      price: 2000000,
      stock: 4,
      category,
      images: ["/images/arctic-showroom-light.webp"],
      attributes: [],
      isActive: true,
      isFeatured: true,
      soldCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", "3024"],
    {
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "production",
        MONGODB_URI: mongo.uri.replace("/?", "/" + dbName + "?"),
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
  server.stdout.on("data", (c) => (output += c));
  server.stderr.on("data", (c) => (output += c));
  for (let n = 0; n < 60; n++) {
    try {
      if ((await fetch(base + "/api/health")).ok) break;
    } catch {}
    await delay(1000);
  }
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const admin = await browser.newContext();
  const page = await admin.newPage();
  async function login(p, email, target) {
    await p.goto(base + "/login?callbackUrl=" + target);
    await p.locator("[name=email]").fill(email);
    await p.locator("[name=password]").fill(password);
    await p.getByRole("button", { name: "ورود", exact: true }).click();
    await p.waitForURL((url) => url.pathname === target);
  }
  await login(page, "admin@example.com", "/admin/content");
  await page.getByLabel("عنوان صفحه", { exact: true }).fill("درباره ما از پنل");
  await page.getByLabel("متن معرفی").fill("متن قابل مدیریت");
  await page.getByRole("button", { name: "افزودن بخش", exact: true }).click();
  await page.getByRole("button", { name: "افزودن پرسش", exact: true }).click();
  await page.getByRole("button", { name: "ذخیره تغییرات" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "تغییرات ذخیره شد" })
    .waitFor();
  await page.goto(base + "/about");
  await page
    .getByRole("heading", { name: "درباره ما از پنل", exact: true })
    .waitFor();
  await page.getByText("پرسش جدید", { exact: true }).waitFor();
  await page.goto(base + "/admin/content?section=services");
  await page.getByLabel("عنوان صفحه", { exact: true }).fill("خدمات مدیریت‌شده");
  await page.getByRole("button", { name: "ذخیره تغییرات" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "تغییرات ذخیره شد" })
    .waitFor();
  await page.goto(base + "/admin/content?section=contact");
  await page.getByLabel("تلفن", { exact: true }).fill("02112345678");
  await page.getByLabel("ایمیل", { exact: true }).fill("support@example.com");
  await page.getByLabel("آدرس", { exact: true }).fill("تهران، آدرس آزمون");
  await page.getByRole("button", { name: "ذخیره تغییرات" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "تغییرات ذخیره شد" })
    .waitFor();
  await page.goto(base + "/services");
  await page
    .getByRole("heading", { name: "خدمات مدیریت‌شده", exact: true })
    .waitFor();
  assert.ok(
    (await page.locator('a[href="mailto:support@example.com"]').count()) >= 2,
  );
  await page.goto(base + "/admin/content?section=slides");
  await page
    .getByLabel("عنوان اصلی", { exact: true })
    .first()
    .fill("اسلاید مدیریت‌شده");
  await page.getByRole("button", { name: "ذخیره تغییرات" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "تغییرات ذخیره شد" })
    .waitFor();
  await page.goto(base);
  await page.getByText("اسلاید مدیریت‌شده", { exact: true }).first().waitFor();
  const guest = await browser.newContext();
  const customer = await guest.newPage();
  await customer.goto(base + "/products");
  const heart = customer.getByRole("button", {
    name: "پسندیدن محصول آزمون",
    exact: true,
  });
  await heart.click();
  await customer
    .getByRole("button", { name: "لغو پسندیدن محصول آزمون", exact: true })
    .waitFor();
  await login(customer, "customer@example.com", "/account/favorites");
  await customer.reload();
  await customer
    .getByRole("button", { name: "لغو پسندیدن محصول آزمون", exact: true })
    .waitFor();
  assert.equal(
    await customer.evaluate(
      (id) => localStorage.getItem("launchox-product-like:" + id),
      String(product),
    ),
    null,
  );
  const device = await browser.newContext();
  const second = await device.newPage();
  await login(second, "customer@example.com", "/account/favorites");
  await second
    .getByRole("button", { name: "لغو پسندیدن محصول آزمون", exact: true })
    .waitFor();
  const anonymous = await guest.request.put(base + "/api/pages/about", {
    data: { title: "forged" },
  });
  assert.notEqual(anonymous.status(), 200); // Customer access must not edit CMS.
  await page.goto(base + "/admin/content");
  await page.setViewportSize({ width: 360, height: 900 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  console.log(
    "PASS: CMS pages, cards, FAQ, contact source, slider, guest merge, second-device favorites, write authorization and mobile form",
  );
} catch (error) {
  console.error(output);
  throw error;
} finally {
  await browser?.close();
  server?.kill();
  await mongoose.disconnect();
  await mongo.stop();
}
