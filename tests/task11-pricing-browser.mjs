import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout } from "node:timers/promises";
import mongoose from "mongoose";
import { startTestMongo } from "./mongo-server.ts";
import { Category } from "@/models/category";
import { Product } from "@/models/product";
import { Brand } from "@/models/brand";
import { User } from "@/models/user";
import { hash } from "bcryptjs";
import { addressInput } from "./fixtures.ts";

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
  uri.pathname = "/launchox_pricing_browser_test";
  await mongoose.connect(uri.toString());
  const category = await Category.create({
    name: "دسته آزمون",
    slug: "comparison-category",
  });
  const brand = await Brand.create({
    name: "برند آزمون",
    slug: "comparison-brand",
  });
  const products = await Product.create(
    Array.from({ length: 3 }, (_, index) => ({
      title: `محصول آزمون ${index}`,
      slug: `comparison-${index}`,
      description: "محصول آزمایشی",
      price: 75000,
      compareAtPrice: index === 2 ? undefined : 100000,
      isFeatured: true,
      soldCount: index === 1 ? 100 : 0,
      stock: index === 0 ? 0 : 3,
      category: category._id,
      brand: brand._id,
      images: ["/images/preview/categories/twin.png"],
      attributes: [{ key: "ظرفیت", value: "۶۰۰ لیتر" }],
      isActive: index !== 13,
    })),
  );
  await User.create({
    name: "کاربر آزمون",
    email: "pricing@example.com",
    passwordHash: await hash("Pricing123!", 12),
    role: "admin",
    addresses: [addressInput],
  });
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
  for (;;) {
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
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  const checks = [];
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/products",
      "/brands/comparison-brand",
      "/categories/comparison-category",
      `/compare?products=${products[1].id}`,
    ]) {
      const response = await page.goto(`${base}${path}`, {
        waitUntil: "networkidle",
      });
      assert.equal(response.status(), 200);
      const card = path.startsWith("/compare")
        ? page.locator("main article").first()
        : page
            .locator("[data-arctic-product-card]")
            .filter({ has: page.locator('a[href="/products/comparison-1"]') })
            .first();
      assert.equal(await card.count(), 1, `${width}:${path}`);
      assert.ok((await card.innerText()).includes("۷۵٬۰۰۰"));
      assert.ok((await card.innerText()).includes("۱۰۰٬۰۰۰"));
      assert.match(await card.innerText(), /(?:۲۵٪|٪۲۵)/);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      checks.push(`${width}:${path}`);
    }
    await page.goto(`${base}/products/comparison-1`, {
      waitUntil: "networkidle",
    });
    assert.ok((await page.locator("main").innerText()).includes("۷۵٬۰۰۰"));
    assert.ok((await page.locator("main").innerText()).includes("۲۵٪"));
    if (width === 360) {
      const quickBuy = page.getByLabel("خرید سریع");
      assert.ok((await quickBuy.innerText()).includes("۷۵٬۰۰۰"));
    }
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    checks.push(`${width}:product details`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "افزودن به سبد خرید", exact: true })
    .first()
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "سبد خرید به‌روز شد" })
    .first()
    .waitFor();
  await page.goto(`${base}/cart`, { waitUntil: "networkidle" });
  assert.ok((await page.locator("main").innerText()).includes("۷۵٬۰۰۰"));
  checks.push("guest cart uses selling price");
  await page.goto(`${base}/login?callbackUrl=/checkout`, {
    waitUntil: "networkidle",
  });
  await page.locator('input[name="email"]').fill("pricing@example.com");
  await page.locator('input[name="password"]').fill("Pricing123!");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/checkout");
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("heading", { name: "آدرس ارسال", exact: true })
    .waitFor();
  assert.ok(
    (await page.locator("main").innerText()).includes("۷۵٬۰۰۰"),
    await page.locator("main").innerText(),
  );
  checks.push("authenticated checkout uses selling price");
  for (const path of ["/admin/products", "/admin/orders"]) {
    assert.equal(
      (
        await page.goto(`${base}${path}`, { waitUntil: "networkidle" })
      ).status(),
      200,
    );
    checks.push(path);
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, checks }));
} finally {
  await browser?.close();
  app?.kill();
  if (app && app.exitCode === null)
    await new Promise((done) => app.once("exit", done));
  await mongoose.disconnect();
  await server.stop();
}
