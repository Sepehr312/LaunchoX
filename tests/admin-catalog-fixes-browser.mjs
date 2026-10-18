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
    await page.locator('.admin-product-form button[type="submit"]').click();
    await page.waitForURL(`${base}/admin/${entity}`);
    await page
      .locator(`a[href^="/admin/${entity}/"][href$="/edit"]`)
      .first()
      .click();
    await page.waitForURL(/\/edit$/);
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
