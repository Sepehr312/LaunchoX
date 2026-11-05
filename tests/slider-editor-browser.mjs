import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
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
const base = "http://localhost:3025";
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
  await db.collection("categories").insertOne({
    _id: category,
    name: "دسته آزمون",
    slug: "test-category",
    isActive: true,
  });
  await db.collection("products").insertOne({
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
    ["node_modules/next/dist/bin/next", "start", "--port", "3025"],
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
  await page.setViewportSize({ width: 1584, height: 1100 });
  page.setDefaultTimeout(30000);
  async function login(p, email, target) {
    await p.goto(base + "/login?callbackUrl=" + target);
    await p.locator("[name=email]").fill(email);
    await p.locator("[name=password]").fill(password);
    await p.getByRole("button", { name: "ورود", exact: true }).click();
    await p.waitForURL((url) => url.pathname === target);
  }
  await login(page, "admin@example.com", "/admin/content");
  await page
    .getByRole("heading", { name: "اسلایدهای صفحه اصلی", exact: true })
    .waitFor();
  const navigation = page
    .getByRole("navigation", { name: "ناوبری مدیریت" })
    .first();
  assert.deepEqual(
    (await navigation.getByRole("link").allTextContents()).slice(0, 3),
    ["نمای کلی", "محتوای فروشگاه", "محصولات"],
  );
  assert.deepEqual(
    await page
      .getByRole("navigation", { name: "بخش‌های محتوای فروشگاه" })
      .getByRole("link")
      .allTextContents(),
    ["اسلایدر", "اطلاعات تماس", "خدمات", "درباره ما"],
  );
  const save = page.getByRole("button", { name: "ذخیره تغییرات", exact: true });
  assert.equal(await save.isDisabled(), true);
  const list = page.getByRole("list", { name: "ترتیب اسلایدها" });
  assert.equal(await list.getByRole("listitem").count(), 3);
  const previewRegion = page.getByRole("region", {
    name: "پیش‌نمایش اسلاید",
    exact: true,
  });
  const contentRegion = page.getByRole("region", {
    name: "محتوای اسلاید",
    exact: true,
  });
  const mediaRegion = page.getByRole("region", {
    name: "تصویر و دکمه‌های اسلاید",
    exact: true,
  });
  const [listBox, previewBox, contentBox, mediaBox, footerBox] =
    await Promise.all([
      list.boundingBox(),
      previewRegion.boundingBox(),
      contentRegion.boundingBox(),
      mediaRegion.boundingBox(),
      page.locator("form footer").boundingBox(),
    ]);
  assert.ok(listBox && previewBox && contentBox && mediaBox && footerBox);
  assert.ok(previewBox.width >= listBox.width);
  assert.ok(previewBox.y >= listBox.y + listBox.height);
  assert.ok(contentBox.y >= previewBox.y + previewBox.height);
  assert.ok(Math.abs(contentBox.y - mediaBox.y) < 2);
  assert.ok(Math.abs(contentBox.width - mediaBox.width) < 2);
  assert.ok(contentBox.x > mediaBox.x);
  assert.ok(
    footerBox.y >=
      Math.max(contentBox.y + contentBox.height, mediaBox.y + mediaBox.height),
  );
  await mkdir(new URL("../test-results/", import.meta.url), {
    recursive: true,
  });
  await page.screenshot({
    path: fileURLToPath(
      new URL("../test-results/slider-wide-editor.png", import.meta.url),
    ),
    fullPage: true,
  });
  await page
    .getByLabel("عنوان اصلی", { exact: true })
    .fill("اسلاید نخست آزمون");
  await page
    .getByRole("heading", { name: "اسلاید نخست آزمون", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "پیش‌نمایش موبایل", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "پیش‌نمایش موبایل", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  const mobileHeroBox = await previewRegion
    .getByRole("img", { name: "پیش‌نمایش تصویر بنر", exact: true })
    .boundingBox();
  assert.ok(mobileHeroBox && mobileHeroBox.width <= 280);
  await page
    .getByRole("button", { name: "پیش‌نمایش دسکتاپ", exact: true })
    .click();
  await page
    .getByRole("button", { name: "افزودن اسلاید", exact: true })
    .click();
  await page
    .getByLabel("عنوان اصلی", { exact: true })
    .fill("اسلاید افزوده آزمون");
  await page.getByRole("switch", { name: "نمایش اسلاید در فروشگاه" }).uncheck();
  await page
    .getByRole("button", { name: "انتقال اسلاید ۴ به بالا", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("عنوان اصلی", { exact: true }).inputValue(),
    "اسلاید افزوده آزمون",
  );
  assert.match(
    await list.getByRole("listitem").nth(2).innerText(),
    /اسلاید افزوده آزمون/,
  );
  await list
    .getByRole("listitem")
    .nth(2)
    .locator('[draggable="true"]')
    .dragTo(list.getByRole("listitem").first());
  assert.match(
    await list.getByRole("listitem").first().innerText(),
    /اسلاید افزوده آزمون/,
  );
  await page
    .getByLabel("لینک داخلی دکمه اصلی", { exact: true })
    .fill("https://example.com");
  await save.click();
  await page.getByRole("alert").filter({ hasText: "لینک باید" }).waitFor();
  assert.equal(
    await db.collection("managedcontents").countDocuments({ key: "slides" }),
    0,
  );
  await page
    .getByLabel("لینک داخلی دکمه اصلی", { exact: true })
    .fill("/products");
  await page
    .getByLabel("نشانی تصویر", { exact: true })
    .fill("javascript:alert(1)");
  await save.click();
  await page.locator("p.admin-error[role=alert]").waitFor();
  await page
    .getByLabel("نشانی تصویر", { exact: true })
    .fill("/images/arctic-showroom-light.webp");
  await page.getByRole("switch", { name: "نمایش اسلاید در فروشگاه" }).check();
  const upload = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/admin/images") &&
      response.request().method() === "POST",
  );
  await page
    .getByLabel("بارگذاری یا جایگزینی تصویر اسلاید", { exact: true })
    .setInputFiles(
      fileURLToPath(
        new URL("../public/images/arctic-showroom-light.webp", import.meta.url),
      ),
    );
  assert.equal((await upload).status(), 201);
  await page.waitForFunction(() =>
    document
      .querySelector('input[dir="ltr"]')
      ?.value.startsWith("/api/images/"),
  );
  await save.click();
  await page
    .getByRole("status")
    .filter({ hasText: "تغییرات ذخیره شد" })
    .waitFor();
  const persisted = await db
    .collection("managedcontents")
    .findOne({ key: "slides" });
  assert.equal(persisted.data.length, 4);
  assert.equal(persisted.data[0].title, "اسلاید افزوده آزمون");
  assert.match(persisted.data[0].dayImage, /^\/api\/images\//);
  await page.reload();
  assert.equal(
    await page.getByLabel("عنوان اصلی", { exact: true }).inputValue(),
    "اسلاید افزوده آزمون",
  );
  await page
    .getByLabel("عنوان اصلی", { exact: true })
    .fill("ویرایش ذخیره‌نشده");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "انصراف", exact: true }).click();
  assert.equal(
    await page.getByLabel("عنوان اصلی", { exact: true }).inputValue(),
    "اسلاید افزوده آزمون",
  );
  assert.equal(await save.isDisabled(), true);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "حذف این اسلاید", exact: true })
    .click();
  assert.equal(await list.getByRole("listitem").count(), 4);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "حذف این اسلاید", exact: true })
    .click();
  assert.equal(await list.getByRole("listitem").count(), 3);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "انصراف", exact: true }).click();
  await mkdir(new URL("../test-results/", import.meta.url), {
    recursive: true,
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: fileURLToPath(
      new URL("../test-results/slider-desktop.png", import.meta.url),
    ),
    fullPage: true,
  });
  await page.setViewportSize({ width: 360, height: 900 });
  const [mobileContent, mobileMedia, mobilePreview] = await Promise.all([
    contentRegion.boundingBox(),
    mediaRegion.boundingBox(),
    previewRegion.boundingBox(),
  ]);
  assert.ok(mobileContent && mobileMedia && mobilePreview);
  assert.ok(mobileContent.y >= mobilePreview.y + mobilePreview.height);
  assert.ok(mobileMedia.y >= mobileContent.y + mobileContent.height);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: fileURLToPath(
      new URL("../test-results/slider-mobile.png", import.meta.url),
    ),
    fullPage: true,
  });
  await page.goto(base);
  await page
    .getByText("اسلاید افزوده آزمون", { exact: true })
    .first()
    .waitFor();
  await page.goto(base + "/admin/content");
  for (let count = 4; count > 0; count--) {
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "حذف این اسلاید", exact: true })
      .click();
  }
  await page
    .getByText("هنوز اسلایدی اضافه نشده است.", { exact: true })
    .waitFor();
  await save.click();
  await page
    .getByRole("status")
    .filter({ hasText: "تغییرات ذخیره شد" })
    .waitFor();
  await page.reload();
  await page
    .getByText("هنوز اسلایدی اضافه نشده است.", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "افزودن اسلاید", exact: true })
    .click();
  assert.equal(await list.getByRole("listitem").count(), 1);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  console.log(
    "PASS: slider navigation, live preview, add, keyboard and drag sorting, validation, image upload, transactional save, reload, discard, deletion confirmation, empty state, storefront and 360px layout",
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
