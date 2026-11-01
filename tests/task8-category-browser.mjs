import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout } from "node:timers/promises";
import mongoose from "mongoose";
import { startTestMongo } from "./mongo-server.ts";
import { Category } from "../src/models/category.ts";
import { Product } from "../src/models/product.ts";
import { Brand } from "../src/models/brand.ts";

const { chromium } = await import(
  pathToFileURL(resolve(process.argv[2], "node_modules/playwright/index.mjs"))
    .href
);
const root = resolve(import.meta.dirname, "..");
const server = await startTestMongo();
let app;
let browser;
try {
  const uri = new URL(server.uri);
  uri.pathname = "/launchox_task8_browser_test";
  await mongoose.connect(uri.toString());
  const category = await Category.create({
    name: "دستهٔ مرورگر",
    slug: "browser-category",
    image: "/images/preview/categories/twin.png",
  });
  const empty = await Category.create({
    name: "دستهٔ خالی",
    slug: "empty-browser",
  });
  await Category.create({
    name: "دستهٔ پنهان",
    slug: "hidden-browser",
    isActive: false,
  });
  const brand = await Brand.create({
    name: "برند مرورگر",
    slug: "browser-brand",
  });
  await Product.create(
    Array.from({ length: 12 }, (_, index) => ({
      title: `محصول مرورگر ${index}`,
      slug: `browser-product-${index}`,
      description: "محصول آزمایشی مرورگر",
      category: category._id,
      brand: brand._id,
      price: 10000 + index * 1000,
      stock: 3,
      images: ["/images/preview/categories/twin.png"],
    })),
  );
  const portServer = createServer();
  await new Promise((done) => portServer.listen(0, "127.0.0.1", done));
  const { port } = portServer.address();
  await new Promise((done) => portServer.close(done));
  const base = `http://127.0.0.1:${port}`;
  const defaults = Object.fromEntries(
    (await readFile(resolve(root, ".env.example"), "utf8"))
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
  app = spawn(
    process.execPath,
    [
      resolve(root, "node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: root,
      windowsHide: true,
      stdio: "ignore",
      env: {
        ...process.env,
        ...defaults,
        NODE_ENV: "production",
        MONGODB_URI: uri.toString(),
        AUTH_URL: base,
        NEXT_PUBLIC_SITE_URL: base,
      },
    },
  );
  const deadline = Date.now() + 60000;
  while (true) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) break;
    } catch {}
    if (Date.now() > deadline)
      throw new Error("Isolated application did not start");
    await setTimeout(300);
  }
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultNavigationTimeout(120000);
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base, { waitUntil: "networkidle" });
    const categoryLink = page.locator(
      '[data-arctic-categories] a[href="/categories/browser-category"]',
    );
    await categoryLink.waitFor();
    assert.equal(
      await categoryLink.locator("img").getAttribute("alt"),
      "نمای نمونهٔ دستهٔ مرورگر",
    );
    assert.equal(
      await page.locator('a[href="/categories/hidden-browser"]').count(),
      0,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    if (width === 360) {
      await page
        .getByRole("button", { name: "باز کردن منو", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("link", { name: "دسته‌بندی", exact: true })
        .click();
    } else {
      await page
        .getByRole("navigation", { name: "منوی اصلی", exact: true })
        .getByRole("link", { name: "دسته‌بندی", exact: true })
        .click();
    }
    await page.waitForURL(`${base}/categories`);
    await page.locator('main a[href="/categories/browser-category"]').click();
    await page.waitForURL(`${base}/categories/browser-category`);
    await page.locator("[data-arctic-product-card]").first().waitFor();
    await page.locator("footer").scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        document.querySelectorAll("[data-arctic-product-card]").length === 12,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  const response = await page.goto(
    `${base}/categories/browser-category?limit=1&page=1&sort=price_asc`,
    { waitUntil: "domcontentloaded" },
  );
  assert.equal(response.status(), 200);
  await page
    .locator('[data-arctic-product-card] a[href="/products/browser-product-0"]')
    .first()
    .waitFor();
  assert.equal(
    (await page
      .locator(
        '[data-arctic-product-card] a[href="/products/browser-product-0"]',
      )
      .count()) > 0,
    true,
  );
  await category.updateOne({
    $set: {
      name: "نام تازهٔ مرورگر",
      slug: "دسته-مرورگر",
      image: "/images/preview/categories/mini.png",
    },
  });
  async function expectMissing(path) {
    await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
    await page
      .getByRole("heading", {
        name: "صفحه یا مورد موردنظر پیدا نشد",
        exact: true,
      })
      .waitFor();
    assert.equal(await page.locator("[data-arctic-product-card]").count(), 0);
    assert.ok(
      (await page.locator('meta[name="robots"][content*="noindex"]').count()) >
        0,
    );
  }
  // Next.js can send 200 before notFound() resolves when loading.tsx streams.
  await expectMissing("/categories/browser-category");
  await page.goto(`${base}/categories/${encodeURIComponent("دسته-مرورگر")}`, {
    waitUntil: "networkidle",
  });
  assert.ok(
    (await page
      .getByRole("heading", { name: "نام تازهٔ مرورگر", exact: true })
      .count()) > 0,
  );
  await page.goto(`${base}/products/browser-product-0`, {
    waitUntil: "networkidle",
  });
  assert.equal(
    await page
      .locator(`nav a[href="/categories/${encodeURIComponent("دسته-مرورگر")}"]`)
      .count(),
    1,
  );
  await category.updateOne({ $set: { isActive: false } });
  await expectMissing(`/categories/${encodeURIComponent("دسته-مرورگر")}`);
  await page.goto(`${base}/products/browser-product-0`, {
    waitUntil: "networkidle",
  });
  assert.equal(await page.locator('nav a[href^="/categories/"]').count(), 0);
  assert.equal(
    (await page.request.get(`${base}/brands/browser-brand`)).status(),
    200,
  );
  assert.equal(
    (await page.request.get(`${base}/categories/${empty.slug}`)).status(),
    200,
  );
  await Category.deleteOne({ _id: empty._id });
  await expectMissing(`/categories/${empty.slug}`);
  assert.deepEqual(errors, []);
  console.log("Task 8 isolated browser checks passed at 1440px and 360px.");
} finally {
  await browser?.close();
  if (app) {
    const stopped = new Promise((done) => app.once("exit", done));
    app.kill();
    await stopped;
  }
  await mongoose.disconnect();
  await server.stop();
}
