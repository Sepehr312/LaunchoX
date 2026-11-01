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
const databaseName = `launchox_card_view_${randomUUID().replaceAll("-", "")}`;
const base = "http://localhost:3024";
const uri = `mongodb://127.0.0.1:27017/${databaseName}`;
let server;
let browser;
let output = "";
try {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const now = new Date();
  await db.collection("users").insertOne({
    name: "مدیر آزمایشی",
    email: "admin@example.com",
    passwordHash: await bcrypt.hash("Browser123!", 12),
    role: "admin",
    isActive: true,
    addresses: [],
    createdAt: now,
    updatedAt: now,
  });
  const brandNames = ["سامسونگ", "ال‌جی", "دوو", "اسنوا", "بوش", "هیمالیا"];
  const brandSlugs = ["samsung", "lg", "daewoo", "snowa", "bosch", "himalia"];
  const brands = await db.collection("brands").insertMany(
    brandNames.map((name, index) => ({
      name,
      slug: brandSlugs[index],
      ...(index === 3 ? {} : { logo: `/qa/brand-${index}.svg` }),
      country: index === 0 ? undefined : "ثبت نشده",
      order: index,
      isActive: index !== 3,
      isFeatured: index === 1,
      createdAt: now,
      updatedAt: now,
    })),
  );
  const categoryNames = [
    "سایدبای‌ساید",
    "یخچال دوقلو",
    "فریزر بالا",
    "فریزر پایین",
    "یخچال کمبی",
    "یخچال مینی",
  ];
  const categorySlugs = [
    "side-by-side",
    "twin",
    "top-freezer",
    "bottom-freezer",
    "combi",
    "mini",
  ];
  const categories = await db.collection("categories").insertMany(
    categoryNames.map((name, index) => ({
      name,
      slug: categorySlugs[index],
      ...(index === 4
        ? {}
        : {
            image: `/images/preview/categories/${categorySlugs[index]}.png`,
          }),
      order: index,
      isActive: index !== 3,
      createdAt: now,
      updatedAt: now,
    })),
  );
  await db
    .collection("categories")
    .updateOne(
      { _id: categories.insertedIds[5] },
      { $set: { parent: categories.insertedIds[0] } },
    );
  await db.collection("products").insertOne({
    title: "محصول متصل",
    slug: "linked-product",
    description: "داده آزمایشی",
    price: 1000,
    stock: 2,
    category: categories.insertedIds[0],
    brand: brands.insertedIds[0],
    images: ["/images/preview/categories/mini.png"],
    attributes: [],
    isActive: true,
    isFeatured: false,
    soldCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", "3024"],
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
    viewport: { width: 1440, height: 1000 },
  });
  // Only the browser fixtures use synthetic wordmarks; application logos come from saved data.
  await context.route("**/qa/brand-*.svg", (route) => {
    const index = Number(
      route
        .request()
        .url()
        .match(/brand-(\d+)\.svg/)[1],
    );
    return route.fulfill({
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="120"><text x="140" y="70" font-family="Arial" font-size="32" font-weight="bold" text-anchor="middle" fill="#006acb">${brandSlugs[index].toUpperCase()}</text></svg>`,
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/admin/brands`);
  assert.ok(page.url().includes("/login"));
  await page.getByLabel("ایمیل", { exact: true }).fill("admin@example.com");
  await page.getByLabel("رمز عبور", { exact: true }).fill("Browser123!");
  await page.getByRole("button", { name: "ورود", exact: true }).click();
  await page.waitForURL(`${base}/admin/brands`);
  const tableButton = page.getByRole("button", {
    name: "نمای جدولی",
    exact: true,
  });
  const cardButton = page.getByRole("button", {
    name: "نمای کارتی",
    exact: true,
  });
  const brandList = page.getByRole("list", {
    name: "کارت‌های برندها",
    exact: true,
  });
  const categoryList = page.getByRole("list", {
    name: "کارت‌های دسته‌بندی‌ها",
    exact: true,
  });
  await tableButton.waitFor();
  assert.equal(await tableButton.getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator("tbody tr").count(), 6);
  await cardButton.click();
  await brandList.waitFor();
  assert.equal(await brandList.locator("article").count(), 6);
  assert.equal(await page.locator("table").count(), 0);
  async function screenshots(entity, list) {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() =>
      Array.from(document.images).every((image) => image.complete),
    );
    assert.ok(
      await list
        .locator("img")
        .evaluateAll((images) =>
          images.every((image) => image.naturalWidth > 0),
        ),
    );
    for (const width of [360, 640, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${entity}: overflow at ${width}`,
      );
      const columns = await list.evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(" ").length,
      );
      assert.equal(columns, width >= 1280 ? 3 : width >= 640 ? 2 : 1);
      if (width === 360 || width === 1440)
        await page.screenshot({
          path: `docs/admin-review/${entity}-cards-${width === 360 ? "mobile" : "desktop"}.png`,
          fullPage: true,
        });
    }
  }
  await screenshots("brands", brandList);
  assert.ok(
    (await brandList
      .locator("article")
      .filter({ hasText: "اسنوا" })
      .locator("svg")
      .count()) > 0,
  );
  await tableButton.focus();
  await tableButton.press("Space");
  await page.locator("tbody tr").first().waitFor();
  assert.equal(await page.locator("tbody tr").count(), 6);
  await cardButton.focus();
  await cardButton.press("Enter");
  await brandList.waitFor();
  await page.getByLabel("جستجوی برند", { exact: true }).fill("سامسونگ");
  await page.waitForURL((url) => url.searchParams.get("q") === "سامسونگ");
  await page.waitForFunction(
    () =>
      document.querySelectorAll('ul[aria-label="کارت‌های برندها"] article')
        .length === 1,
  );
  assert.equal(await cardButton.getAttribute("aria-pressed"), "true");
  assert.equal(await page.evaluate(() => document.activeElement?.name), "q");
  await page.reload();
  await brandList.waitFor();
  assert.equal(await brandList.locator("article").count(), 1);
  await page.getByLabel("جستجوی برند", { exact: true }).fill("");
  await page.waitForURL(`${base}/admin/brands`);
  await page.waitForFunction(
    () =>
      document.querySelectorAll('ul[aria-label="کارت‌های برندها"] article')
        .length === 6,
  );
  await page.goto(`${base}/admin/categories`);
  await tableButton.waitFor();
  assert.equal(await tableButton.getAttribute("aria-pressed"), "true");
  await cardButton.click();
  await categoryList.waitFor();
  assert.equal(await categoryList.locator("article").count(), 6);
  await screenshots("categories", categoryList);
  await page.getByLabel("جستجوی دسته‌بندی", { exact: true }).fill("مینی");
  await page.waitForURL((url) => url.searchParams.get("q") === "مینی");
  await page.waitForFunction(
    () =>
      document.querySelectorAll(
        'ul[aria-label="کارت‌های دسته‌بندی‌ها"] article',
      ).length === 1,
  );
  assert.ok((await categoryList.textContent()).includes("سایدبای‌ساید"));
  await tableButton.click();
  await page.locator("tbody tr").first().waitFor();
  assert.equal(
    await page.getByLabel("جستجوی دسته‌بندی", { exact: true }).inputValue(),
    "مینی",
  );
  assert.equal(await page.locator("tbody tr").count(), 1);
  await cardButton.click();
  await categoryList.waitFor();
  await page.getByLabel("جستجوی دسته‌بندی", { exact: true }).fill("ناپیدا");
  await page.locator(".admin-empty").waitFor();
  assert.equal(await cardButton.getAttribute("aria-pressed"), "true");
  await page.getByLabel("جستجوی دسته‌بندی", { exact: true }).fill("");
  await page.waitForURL(`${base}/admin/categories`);
  await categoryList.waitFor();
  const linkedCategory = categoryList.locator("article").filter({
    has: page.getByRole("heading", { name: "سایدبای‌ساید", exact: true }),
  });
  page.once("dialog", (dialog) => dialog.accept());
  await linkedCategory
    .getByRole("button", { name: "حذف دسته‌بندی", exact: true })
    .click();
  await linkedCategory.locator('[role="alert"]').waitFor();
  assert.ok(
    await db
      .collection("categories")
      .findOne({ _id: categories.insertedIds[0] }),
  );
  await page.goto(`${base}/admin/brands`);
  await brandList.waitFor();
  const linkedBrand = brandList.locator("article").filter({
    has: page.getByRole("heading", { name: "سامسونگ", exact: true }),
  });
  page.once("dialog", (dialog) => dialog.accept());
  await linkedBrand
    .getByRole("button", { name: "حذف برند سامسونگ", exact: true })
    .click();
  await linkedBrand.locator('[role="alert"]').waitFor();
  assert.ok(
    await db.collection("brands").findOne({ _id: brands.insertedIds[0] }),
  );
  const disposable = brandList.locator("article").filter({
    has: page.getByRole("heading", { name: "هیمالیا", exact: true }),
  });
  page.once("dialog", (dialog) => dialog.dismiss());
  await disposable
    .getByRole("button", { name: "حذف برند هیمالیا", exact: true })
    .click();
  assert.ok(
    await db.collection("brands").findOne({ _id: brands.insertedIds[5] }),
  );
  page.once("dialog", (dialog) => dialog.accept());
  await disposable
    .getByRole("button", { name: "حذف برند هیمالیا", exact: true })
    .click();
  await disposable.waitFor({ state: "detached" });
  assert.equal(
    await db.collection("brands").findOne({ _id: brands.insertedIds[5] }),
    null,
  );
  await page.evaluate(() =>
    localStorage.setItem("launchox:admin:brands:view", "invalid"),
  );
  await page.reload();
  await tableButton.waitFor();
  assert.equal(await tableButton.getAttribute("aria-pressed"), "true");
  for (const blockReads of [true, false]) {
    const blocked = await context.newPage();
    blocked.on("pageerror", (error) => errors.push(error.message));
    await blocked.addInitScript((blockReads) => {
      localStorage.setItem("launchox:admin:brands:view", "table");
      const read = Storage.prototype.getItem;
      const write = Storage.prototype.setItem;
      Storage.prototype.getItem = function (key) {
        if (blockReads && key.startsWith("launchox:admin:"))
          throw new Error("Storage disabled");
        return read.call(this, key);
      };
      Storage.prototype.setItem = function (key, value) {
        if (key.startsWith("launchox:admin:"))
          throw new Error("Storage disabled");
        return write.call(this, key, value);
      };
    }, blockReads);
    await blocked.goto(`${base}/admin/brands`);
    await blocked
      .getByRole("button", { name: "نمای کارتی", exact: true })
      .click();
    await blocked
      .getByRole("list", { name: "کارت‌های برندها", exact: true })
      .waitFor();
    await blocked.close();
  }
  await db.collection("categories").deleteMany({});
  await page.goto(`${base}/admin/categories`);
  await page.locator(".admin-empty").waitFor();
  assert.equal(await cardButton.getAttribute("aria-pressed"), "true");
  await tableButton.click();
  assert.equal(await page.locator(".admin-empty").count(), 1);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: table/card switching and keyboard controls; independent preferences restored across routes/reloads; live search and empty states; real image/fallback rendering; 360/640/768/1024/1280/1440 layouts; linked-delete protection and confirmation; invalid/blocked storage; four screenshots saved.",
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
