import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(
  pathToFileURL(resolve(process.argv[2], "node_modules/playwright/index.mjs"))
    .href
);
const base = process.argv[3] ?? "http://localhost:3003";
const browser = await chromium.launch({
  executablePath:
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  const response = await page.request.get(`${base}/api/products?limit=4`);
  assert.equal(response.status(), 200);
  const {
    data: { items: products },
  } = await response.json();
  assert.ok(products.length >= 4);
  await page.goto(`${base}/products`, { waitUntil: "networkidle" });
  const navigation = page.getByRole("navigation", {
    name: "منوی اصلی",
    exact: true,
  });
  assert.equal(
    await navigation
      .getByRole("link", { name: "مقایسه", exact: true })
      .getAttribute("href"),
    "/compare",
  );
  const card = page.locator("article[data-arctic-product-card]").first();
  const firstId = products[0].id;
  await card.getByRole("link", { name: /^مقایسه / }).click();
  await page.waitForURL(/\/compare\?products=/);
  await page.locator("main article").first().waitFor();
  const firstSelection = new URL(page.url()).searchParams
    .get("products")
    .split(",");
  assert.equal(firstSelection.length, 1);
  await page.waitForFunction(
    () => localStorage.getItem("launchox:comparison") !== null,
  );
  const second = products.find(
    (product) => !firstSelection.includes(product.id),
  );
  await page.goto(`${base}/products/${second.slug}`, {
    waitUntil: "networkidle",
  });
  await page
    .locator('[data-product-details="storefront"]')
    .getByRole("link", { name: `مقایسه ${second.title}`, exact: true })
    .click();
  await page.waitForURL(/\/compare\?products=/);
  await page.waitForFunction(
    () => document.querySelectorAll("main article").length === 2,
  );
  const ids = new URL(page.url()).searchParams.get("products").split(",");
  assert.deepEqual(ids, [...firstSelection, second.id]);
  await page.goto(`${base}/compare`, { waitUntil: "networkidle" });
  await page.waitForURL(/\/compare\?products=/);
  assert.deepEqual(
    new URL(page.url()).searchParams.get("products").split(","),
    ids,
  );
  await page.goto(`${base}/compare?products=${firstId}`, {
    waitUntil: "networkidle",
  });
  assert.equal(await page.locator("main article").count(), 1);
  assert.equal(
    await page.locator("main article h2").textContent(),
    products[0].title.replace(/[0-9]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]),
  );
  await page
    .getByRole("button", { name: "افزودن محصول برای انتخابی دقیق‌تر" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: /^افزودن / })
    .first()
    .waitFor();
  await page.setViewportSize({ width: 360, height: 740 });
  const scroll = await dialog.evaluate((element) => {
    element.scrollTop = 100;
    return {
      hidden: getComputedStyle(element).scrollbarWidth === "none",
      scrollable: element.scrollHeight > element.clientHeight,
      moved: element.scrollTop > 0,
    };
  });
  assert.deepEqual(scroll, { hidden: true, scrollable: true, moved: true });
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "پاک کردن مقایسه", exact: true })
    .click();
  await page.goto(`${base}/compare`, { waitUntil: "networkidle" });
  assert.equal(await page.locator("main article").count(), 0);
  const fourIds = products.map((product) => product.id);
  await page.goto(`${base}/compare?products=${fourIds.join(",")}`, {
    waitUntil: "networkidle",
  });
  assert.equal(await page.locator("main article").count(), 4);
  await page.goto(`${base}/products`, { waitUntil: "networkidle" });
  // Use the link text since its accessible label includes the product title.
  const extraLink = page
    .locator("article[data-arctic-product-card] a")
    .filter({ hasText: "مقایسه محصول" })
    .first();
  await extraLink.click();
  await page
    .getByText("حداکثر چهار محصول قابل مقایسه است.", { exact: false })
    .waitFor();
  assert.ok(page.url().includes("/products"));
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.getByRole("link", { name: "مدیریت مقایسه" }).click();
  await page.waitForURL(/\/compare\?products=/);
  await page.waitForFunction(
    () => document.querySelectorAll("main article").length === 4,
  );
  assert.equal(await page.locator("main article").count(), 4);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      passed: true,
      checks: [
        "navigation",
        "product card",
        "product details",
        "cross-page persistence",
        "URL priority",
        "clear",
        "four-product limit",
        "hidden scrollbar with scrolling",
        "360px overflow",
      ],
    }),
  );
} finally {
  await browser.close();
}
