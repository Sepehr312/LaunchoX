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
import { runAboutEditorScenario } from "./about-editor-browser-scenario.mjs";
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
        CONTACT_PHONE: "02187654321",
        CONTACT_EMAIL: "initial@example.com",
        CONTACT_ADDRESS: "تهران، نشانی اولیه",
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
  const originalAbout = await browser.newPage({
    viewport: { width: 1902, height: 908 },
  });
  await mkdir(new URL("../test-results/", import.meta.url), {
    recursive: true,
  });
  await originalAbout.goto(base + "/about");
  await originalAbout.getByRole("heading", { name: /سرمایی مطمئن/ }).waitFor();
  await originalAbout.screenshot({
    path: fileURLToPath(
      new URL("../test-results/about-public-desktop.png", import.meta.url),
    ),
    fullPage: true,
  });
  await originalAbout.setViewportSize({ width: 360, height: 900 });
  assert.ok(
    await originalAbout.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await originalAbout.screenshot({
    path: fileURLToPath(
      new URL("../test-results/about-public-mobile.png", import.meta.url),
    ),
    fullPage: true,
  });
  await originalAbout.close();
  await runAboutEditorScenario({ page, browser, db, base });
  await page.goto(base + "/admin/content?section=services");
  await page.getByLabel("عنوان صفحه", { exact: true }).fill("خدمات مدیریت‌شده");
  await page.getByRole("button", { name: "ذخیره تغییرات" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "تغییرات ذخیره شد" })
    .waitFor();
  await page.goto(base + "/admin/content?section=contact");
  await page.setViewportSize({ width: 1584, height: 1100 });
  const phoneInput = page.getByLabel("شماره تماس", { exact: true });
  const emailInput = page.getByLabel("ایمیل پشتیبانی", { exact: true });
  const addressInput = page.getByLabel("نشانی فروشگاه", { exact: true });
  const contactSave = page.getByRole("button", {
    name: "ذخیره تغییرات",
    exact: true,
  });
  const contactPreview = page.getByRole("region", {
    name: "پیش‌نمایش اطلاعات تماس",
    exact: true,
  });
  assert.equal(await phoneInput.inputValue(), "02187654321");
  assert.equal(await contactSave.isDisabled(), true);
  await phoneInput.fill("02111111111");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "انصراف", exact: true }).click();
  assert.equal(await phoneInput.inputValue(), "02187654321");
  await phoneInput.fill("invalid");
  await emailInput.fill("not-an-email");
  await contactSave.click();
  await page
    .getByText("اطلاعات مشخص‌شده را اصلاح کنید و دوباره ذخیره کنید.", {
      exact: true,
    })
    .waitFor();
  assert.equal(await phoneInput.getAttribute("aria-invalid"), "true");
  assert.equal(await emailInput.getAttribute("aria-invalid"), "true");
  assert.equal(
    await db.collection("managedcontents").countDocuments({ key: "contact" }),
    0,
  );
  await phoneInput.fill("۰۲۱۱۲۳۴۵۶۷۸");
  await emailInput.fill("support@example.com");
  const contactAddress = "تهران، خیابان ولیعصر، بالاتر از میدان ونک، پلاک 12";
  await addressInput.fill(contactAddress);
  assert.equal(await phoneInput.inputValue(), "02112345678");
  await contactPreview.getByText("۰۲۱۱۲۳۴۵۶۷۸", { exact: true }).waitFor();
  await contactPreview
    .getByText("support@example.com", { exact: true })
    .waitFor();
  assert.equal(
    await contactPreview
      .getByRole("link", { name: "تماس با فروشگاه" })
      .getAttribute("href"),
    "tel:02112345678",
  );
  const contactRoute = "**/admin/content?section=contact";
  await page.route(contactRoute, (route) =>
    route.request().method() === "POST"
      ? route.abort("failed")
      : route.continue(),
  );
  await contactSave.click();
  await page
    .getByText("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.", { exact: true })
    .waitFor();
  assert.equal(await emailInput.inputValue(), "support@example.com");
  assert.equal(
    await db.collection("managedcontents").countDocuments({ key: "contact" }),
    0,
  );
  await page.unroute(contactRoute);
  await contactSave.click();
  await page
    .getByRole("status")
    .filter({ hasText: "تغییرات ذخیره شد" })
    .waitFor();
  await page.reload();
  assert.equal(await emailInput.inputValue(), "support@example.com");
  assert.equal(await addressInput.inputValue(), contactAddress);
  const [contactFormBox, contactPreviewBox] = await Promise.all([
    page
      .getByRole("region", { name: "اطلاعات تماس فروشگاه", exact: true })
      .boundingBox(),
    contactPreview.boundingBox(),
  ]);
  assert.ok(
    contactFormBox &&
      contactPreviewBox &&
      contactFormBox.x > contactPreviewBox.x,
  );
  assert.ok(Math.abs(contactFormBox.y - contactPreviewBox.y) < 2);
  assert.ok(Math.abs(contactFormBox.height - contactPreviewBox.height) < 2);
  assert.equal(
    await page
      .getByRole("region", { name: "راهنمای ثبت اطلاعات", exact: true })
      .count(),
    0,
  );
  await mkdir(new URL("../test-results/", import.meta.url), {
    recursive: true,
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: fileURLToPath(
      new URL("../test-results/contact-desktop.png", import.meta.url),
    ),
    fullPage: true,
  });
  await page.setViewportSize({ width: 360, height: 900 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: fileURLToPath(
      new URL("../test-results/contact-mobile.png", import.meta.url),
    ),
    fullPage: true,
  });
  await phoneInput.fill("");
  await emailInput.fill("");
  await addressInput.fill("");
  await contactPreview
    .getByText("اطلاعات تماس رسمی هنوز منتشر نشده است.", { exact: true })
    .waitFor();
  await contactSave.click();
  await page
    .getByRole("status")
    .filter({ hasText: "تغییرات ذخیره شد" })
    .waitFor();
  await page.goto(base + "/about");
  await page
    .getByRole("contentinfo")
    .getByText("اطلاعات تماس رسمی هنوز منتشر نشده است.", { exact: true })
    .waitFor();
  await page.goto(base + "/admin/content?section=contact");
  assert.equal(await phoneInput.inputValue(), "");
  await phoneInput.fill("02112345678");
  await emailInput.fill("support@example.com");
  await addressInput.fill(contactAddress);
  await contactSave.click();
  await page
    .getByRole("status")
    .filter({ hasText: "تغییرات ذخیره شد" })
    .waitFor();
  await page.setViewportSize({ width: 1584, height: 1100 });
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
    "PASS: CMS pages, cards, FAQ, contact preview/equal-height cards/validation/discard/network retry/save/reload/empty state/mobile layout, slider, guest merge, second-device favorites and write authorization",
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
