import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Use an existing external Playwright installation without adding an app dependency.
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.LAUNCHO_PLAYWRIGHT_PATH || "playwright",
);
const databaseName = `launchox_admin_fixes_${randomUUID().replaceAll("-", "")}`;
const uri = `mongodb://127.0.0.1:27017/${databaseName}`;
const base = "http://localhost:3022";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
let server;
let browser;
let output = "";
try {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  await db.collection("users").insertOne({
    name: "Browser admin",
    email: "admin@example.com",
    passwordHash: await bcrypt.hash("Browser123!", 12),
    role: "admin",
    isActive: true,
  });
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", "3022"],
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
  for (let attempt = 0; attempt < 90; attempt++) {
    if (server.exitCode !== null) throw new Error(output);
    try {
      if ((await fetch(`${base}/api/health`)).ok) break;
    } catch {
      /* The isolated server is still starting. */
    }
    await delay(1000);
  }
  browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/login?callbackUrl=/admin/categories`);
  await page.locator('input[name="email"]').fill("admin@example.com");
  await page.locator('input[name="password"]').fill("Browser123!");
  await page.getByRole("button", { name: "ورود", exact: true }).click();
  await page.waitForURL(`${base}/admin/categories`);

  for (const entity of ["categories", "brands", "products"]) {
    await page.goto(`${base}/admin/${entity}/new`);
    for (const width of [360, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.locator(".admin-editor-main").waitFor({ state: "visible" });
      await page.locator(".admin-editor-aside").waitFor({ state: "visible" });
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(await page.locator(".admin-editor-aside").count(), 1);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${entity} create form overflows at ${width}px`,
      );
      const main = await page.locator(".admin-editor-main").boundingBox();
      const aside = await page.locator(".admin-editor-media").boundingBox();
      assert.ok(main && aside, `${entity}: form columns must be visible`);
      assert.ok(
        width >= 1200
          ? Math.abs(main.y - aside.y) < 2
          : main.y >= aside.y + aside.height,
      );
      if (entity === "products" && width < 1200) {
        const headings = await page
          .locator(".admin-product-form h2")
          .allTextContents();
        assert.deepEqual(headings, [
          "تصاویر محصول",
          "اطلاعات اصلی",
          "قیمت و موجودی",
          "مشخصات فنی",
          "انتشار محصول",
        ]);
      }
    }
    const active = page.locator('input[name="isActive"]');
    await active.focus();
    await page.keyboard.press("Space");
    assert.equal(await active.isChecked(), false);
    await page.keyboard.press("Space");
    assert.equal(await active.isChecked(), true);
    assert.equal(
      await page.locator('.admin-editor-aside input[name="isActive"]').count(),
      1,
    );
    if (entity === "products") {
      assert.equal(
        await page.locator('.admin-editor-media input[name="images"]').count(),
        1,
      );
      await page
        .getByRole("button", { name: "افزودن تصویر", exact: true })
        .click();
      const images = page.locator('input[name="images"]');
      await images.nth(0).fill("https://example.com/first.jpg");
      await images.nth(1).fill("https://example.com/second.jpg");
      await page
        .getByRole("button", { name: "جابه‌جایی تصویر ۲ به بالا" })
        .click();
      assert.equal(
        await images.nth(0).inputValue(),
        "https://example.com/second.jpg",
      );
      assert.equal(
        await images.nth(1).inputValue(),
        "https://example.com/first.jpg",
      );
      await page
        .getByRole("button", { name: "حذف تصویر ۲", exact: true })
        .click();
      await page
        .getByRole("button", { name: "افزودن مشخصه", exact: true })
        .click();
      await page.locator('input[name="attributeKey"]').fill("نوع اتصال");
      await page.locator('input[name="attributeValue"]').fill("بلوتوث");
    }
    await page
      .locator(`input[name="${entity === "products" ? "title" : "name"}"]`)
      .fill(`آزمایش ${entity}`);
    if (entity === "products") {
      await page
        .locator('textarea[name="description"]')
        .fill("توضیحات محصول آزمایشی");
      await page.locator('input[name="price"]').fill("۱۰۰۰۰۰");
      const category = await db.collection("categories").findOne({});
      await page
        .locator('select[name="category"]')
        .selectOption(String(category._id));
      const brand = await db.collection("brands").findOne({});
      const brandSelect = page.locator('select[name="brand"]');
      assert.equal(
        await brandSelect.evaluate(
          (element) => element.required && element.validity.valueMissing,
        ),
        true,
      );
      await brandSelect.selectOption(String(brand._id));
    }
    const input = page.locator('input[type="file"]').first();
    assert.equal(await input.count(), 1);
    const upload = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/admin/images") &&
        response.request().method() === "POST",
    );
    await input.setInputFiles({
      name: "image.png",
      mimeType: "image/png",
      buffer: png,
    });
    assert.equal((await upload).status(), 201);
    const imageField = page
      .locator(
        `input[name="${entity === "products" ? "images" : entity === "brands" ? "logo" : "image"}"]`,
      )
      .first();
    await page.waitForFunction(
      (name) =>
        document
          .querySelector(`input[name="${name}"]`)
          .value.startsWith("/api/images/"),
      entity === "products" ? "images" : entity === "brands" ? "logo" : "image",
    );
    const imageUrl = await imageField.inputValue();
    const image = await context.request.get(`${base}${imageUrl}`);
    assert.equal(image.status(), 200);
    assert.deepEqual(await image.body(), png);
    for (const width of [360, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `docs/admin-review/${entity}-form-approved-${width}.png`,
        fullPage: true,
      });
    }
    if (entity === "products") {
      const brandSelect = page.locator('select[name="brand"]');
      const selectedBrand = await brandSelect.inputValue();
      await brandSelect.selectOption("");
      await page.locator(".admin-product-form").evaluate((form) => {
        form.noValidate = true;
      });
      await page.locator('.admin-product-form button[type="submit"]').click();
      await page
        .getByRole("alert")
        .filter({ hasText: "انتخاب برند الزامی است" })
        .waitFor();
      assert.equal(await db.collection("products").countDocuments(), 0);
      await brandSelect.selectOption(selectedBrand);
      await page.locator(".admin-product-form").evaluate((form) => {
        form.noValidate = false;
      });
    }
    await page.locator('.admin-product-form button[type="submit"]').click();
    await page.waitForURL(`${base}/admin/${entity}`);
    await page
      .locator(`a[href^="/admin/${entity}/"][href$="/edit"]`)
      .first()
      .click();
    await page.waitForURL(/\/edit$/);
    await page.locator(".admin-editor-page h1").waitFor();
    await page.setViewportSize({ width: 360, height: 900 });
    assert.equal(await page.locator("h1").count(), 1);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${entity} edit form overflows at 360px`,
    );
    assert.equal(
      await page
        .locator(
          `input[name="${entity === "products" ? "images" : entity === "brands" ? "logo" : "image"}"]`,
        )
        .first()
        .inputValue(),
      imageUrl,
    );
    await page.locator('.admin-product-form button[type="submit"]').click();
    await page.waitForURL(`${base}/admin/${entity}`);
    console.log(
      `PASS: ${entity} upload, persistent image, create/edit redirects`,
    );
    if (entity === "products") {
      const product = await db.collection("products").findOne({});
      const response = await page.goto(
        `${base}/products/${encodeURIComponent(product.slug)}`,
      );
      assert.equal(response.status(), 200);
      await page
        .getByRole("heading", { name: product.title, exact: true })
        .waitFor();
      console.log("PASS: admin-created product is visible in the storefront");
    }
  }

  const category = await db.collection("categories").findOne({});
  for (const legacy of [false, true]) {
    if (legacy) {
      await db.collection("products").deleteMany({});
      await db
        .collection("products")
        .insertOne({ category: String(category._id), isActive: false });
    }
    await page.goto(`${base}/admin/categories`);
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "حذف دسته‌بندی", exact: true })
      .click();
    await page.getByRole("alert").filter({ hasText: "دارای محصول" }).waitFor();
    assert.ok(await db.collection("categories").findOne({ _id: category._id }));
    assert.equal(await db.collection("products").countDocuments(), 1);
  }
  console.log(
    "PASS: linked-category deletion blocked for ObjectId and legacy string references, products preserved",
  );

  // Restore a populated product row for mobile scroll testing.
  await db.collection("products").deleteMany({});
  await db.collection("products").insertOne({
    title: "محصول آزمایشی",
    slug: "scroll",
    description: "تست",
    price: 1000,
    stock: 1,
    images: ["/images/preview/categories/mini.png"],
    category: category._id,
    isActive: true,
    isFeatured: false,
    attributes: [],
    soldCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  for (const touch of [false, true]) {
    const mobile = await browser.newContext({
      viewport: { width: 360, height: 800 },
      isMobile: touch,
      hasTouch: touch,
    });
    await mobile.addCookies(await context.cookies());
    const tab = await mobile.newPage();
    for (const entity of ["products", "categories", "brands"]) {
      await tab.goto(`${base}/admin/${entity}`);
      const table = tab.locator(".admin-table-scroll");
      await table.scrollIntoViewIfNeeded();
      assert.ok(
        await tab.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const bounds = await table.boundingBox();
      const x = bounds.x + bounds.width * 0.25;
      const y = bounds.y + 25;
      if (touch) {
        const session = await mobile.newCDPSession(tab);
        await session.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x, y }],
        });
        for (let step = 1; step <= 10; step++) {
          await session.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: x + step * 15, y }],
          });
          await delay(25);
        }
        await session.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await session.detach();
      } else {
        await tab.mouse.move(x, y);
        await tab.mouse.down();
        await tab.mouse.move(x + 150, y, { steps: 10 });
        await tab.mouse.up();
      }
      await delay(250);
      assert.ok(
        Math.abs(await table.evaluate((element) => element.scrollLeft)) > 30,
        `${entity}: ${touch ? "touch" : "mouse"} scroll failed`,
      );
    }
    await mobile.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: all three mobile tables scroll by touch and mouse drag at 360px without page overflow",
  );
} catch (error) {
  console.error(output.slice(-4000));
  throw error;
} finally {
  await browser?.close();
  server?.kill();
  // The randomly named database is created exclusively by this test.
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
