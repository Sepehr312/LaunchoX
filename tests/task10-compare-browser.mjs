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
  uri.pathname = "/launchox_comparison_browser_test";
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
    Array.from({ length: 14 }, (_, index) => ({
      title: `محصول آزمون ${index}`,
      slug: `comparison-${index}`,
      description: "محصول آزمایشی",
      price: 10000,
      stock: index === 0 ? 0 : 3,
      category: category._id,
      brand: brand._id,
      images: ["/images/preview/categories/twin.png"],
      attributes: [{ key: "ظرفیت", value: "۶۰۰ لیتر" }],
      isActive: index !== 13,
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
  let actionRequest;
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("request", (request) => {
    if (request.headers()["next-action"]) actionRequest = request;
  });
  page.setDefaultTimeout(30000);
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 900 });
    const selected = [
      products[0].id.toUpperCase(),
      products[1].id,
      products[0].id,
      products[2].id,
      products[1].id,
    ];
    await page.goto(`${base}/compare?products=${selected.join(",")}`, {
      waitUntil: "networkidle",
    });
    assert.equal(await page.locator("main article").count(), 3);
    assert.ok(
      (await page.getByText("برند آزمون", { exact: true }).count()) >= 3,
    );
    assert.ok((await page.getByText("۶۰۰ لیتر", { exact: true }).count()) >= 3);
    assert.equal(await page.getByText("ناموجود", { exact: true }).count(), 1);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page
      .getByRole("button", { name: /^حذف .* از مقایسه$/ })
      .first()
      .click();
    assert.equal(await page.locator("main article").count(), 2);
    assert.equal(
      new URL(page.url()).searchParams.get("products").split(",").length,
      2,
    );
    await page
      .getByRole("button", { name: "افزودن محصول", exact: false })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: /^افزودن / })
      .first()
      .waitFor();
    assert.equal(
      await dialog
        .getByRole("button", { name: "بعدی", exact: true })
        .isEnabled(),
      true,
    );
    await dialog.getByRole("button", { name: "بعدی", exact: true }).click();
    await dialog.getByText("۲ / ۲", { exact: true }).waitFor();
    await dialog
      .getByRole("button", { name: /^افزودن / })
      .first()
      .click();
    assert.equal(await page.locator("main article").count(), 3);
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "پاک کردن مقایسه", exact: true })
      .click();
    assert.equal(await page.locator("main article").count(), 0);
    await page.goto(`${base}/compare`, { waitUntil: "networkidle" });
    assert.equal(await page.locator("main article").count(), 0);
  }
  assert.ok(actionRequest, "Picker must use a real guest Server Action");
  const csrf = await page.request.post(`${base}/compare`, {
    headers: {
      "next-action": actionRequest.headers()["next-action"],
      "content-type": actionRequest.headers()["content-type"],
      origin: "https://untrusted.invalid",
    },
    data: actionRequest.postData(),
  });
  assert.equal(csrf.status(), 500);
  const inactive = products[13].id;
  const deleted = products[12].id;
  await Product.deleteOne({ _id: products[12]._id });
  await page.goto(
    `${base}/compare?products=${inactive},${deleted},${products[0].id}`,
    { waitUntil: "networkidle" },
  );
  assert.equal(await page.locator("main article").count(), 1);
  await page
    .getByText(
      "بعضی از محصولات لینک، حذف یا غیرفعال شده‌اند و قابل نمایش نیستند.",
    )
    .waitFor();
  await page.goto(
    `${base}/compare?products=${products
      .slice(0, 5)
      .map((item) => item.id)
      .join(",")}`,
    { waitUntil: "networkidle" },
  );
  assert.equal(await page.locator("main article").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      passed: true,
      checks: [
        "guest action",
        "deduplicated URL",
        "add/remove/clear",
        "storage",
        "picker pagination",
        "Brand reference",
        "attributes",
        "out-of-stock visibility",
        "inactive/deleted exclusion",
        "unique limit",
        "CSRF origin rejection",
        "1440px/360px overflow",
      ],
    }),
  );
} finally {
  await browser?.close();
  app?.kill();
  if (app && app.exitCode === null)
    await new Promise((done) => app.once("exit", done));
  await mongoose.disconnect();
  await server.stop();
}
