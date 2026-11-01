import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(
  pathToFileURL(resolve(process.argv[2], "node_modules/playwright/index.mjs"))
    .href
);
const base = process.argv[3] ?? "http://127.0.0.1:3018";
const persian = (value) =>
  String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (url) => {
          window.copiedProductUrl = url;
        },
      },
      configurable: true,
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  const response = await page.request.get(`${base}/api/products?limit=48`);
  assert.equal(response.status(), 200);
  const records = (await response.json()).data.items;
  assert.ok(records.length > 0, "The local catalog needs at least one product");
  const product = records.find((item) => item.stock > 0) ?? records[0];
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/products/${product.slug}`, {
      waitUntil: "networkidle",
    });
    assert.equal(await page.locator("h1").innerText(), persian(product.title));
    const details = page.locator('[data-product-details="storefront"]');
    assert.equal(await details.getAttribute("data-product-id"), product.id);
    const text = await details.innerText();
    for (const phrase of ["پیش‌نمایش", "آزمایشی", "دیدگاه", "پرسش و پاسخ"]) {
      assert.ok(!text.includes(phrase), `Unexpected content: ${phrase}`);
    }
    assert.deepEqual(
      await page
        .locator('nav[aria-label="بخش‌های اطلاعات محصول"] a')
        .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
      ["#description", "#specifications", "#related"],
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    for (const attribute of product.attributes) {
      assert.ok(
        await page
          .locator("#specifications")
          .innerText()
          .then((value) => value.includes(persian(attribute.value))),
      );
    }
    await page
      .getByRole("button", { name: "اشتراک‌گذاری محصول", exact: true })
      .click();
    assert.ok((await details.innerText()).includes("پیوند محصول کپی شد."));
    const copied = new URL(await page.evaluate(() => window.copiedProductUrl));
    assert.equal(
      decodeURIComponent(copied.pathname),
      `/products/${product.slug}`,
    );
    await page.evaluate(() => {
      navigator.clipboard.writeText = async () => {
        throw new Error("Clipboard unavailable");
      };
    });
    await page
      .getByRole("button", { name: "اشتراک‌گذاری محصول", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("پیوند محصول", { exact: true }).inputValue(),
      copied.href,
    );
    await page
      .getByRole("button", { name: "باز کردن گالری بزرگ", exact: true })
      .click();
    assert.equal(await page.locator("dialog[open]").count(), 1);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog[open]").count(), 0);
    console.log(
      `PASS ${width}px: database content, supported tabs, share/copy fallback, gallery, no overflow`,
    );
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
