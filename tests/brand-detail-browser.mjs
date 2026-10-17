import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  pathToFileURL(
    resolve(process.argv[2] ?? ".", "node_modules/playwright/index.mjs"),
  ).href
);
const base = process.argv[3] ?? "http://127.0.0.1:3000";

async function main() {
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
    await page.goto(`${base}/brands`, { waitUntil: "networkidle" });
    const desktopBrandLink = page
      .getByRole("navigation", { name: "منوی اصلی", exact: true })
      .getByRole("link", { name: "برندها", exact: true });
    assert.equal(await desktopBrandLink.getAttribute("href"), "/brands");
    assert.equal(await desktopBrandLink.getAttribute("aria-current"), "page");
    await desktopBrandLink.click();
    await page.waitForURL(`${base}/brands`);
    await page.setViewportSize({ width: 360, height: 800 });
    await page
      .getByRole("button", { name: "باز کردن منو", exact: true })
      .click();
    const mobileMenu = page.getByRole("dialog");
    await mobileMenu.getByRole("link", { name: "برندها", exact: true }).click();
    await mobileMenu.waitFor({ state: "hidden" });
    assert.equal(new URL(page.url()).pathname, "/brands");
    await page.setViewportSize({ width: 1440, height: 1000 });
    const hrefs = await page
      .locator('main a[href^="/brands/"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    let slug;
    let expected;
    for (const href of hrefs) {
      const cardSlug = decodeURIComponent(
        new URL(href, base).pathname.split("/").pop(),
      );
      const params = new URLSearchParams({ brandSlug: cardSlug });
      params.set("limit", "48");
      const response = await page.request.get(`${base}/api/products?${params}`);
      assert.equal(response.status(), 200);
      const data = (await response.json()).data;
      if (data.total >= 2) {
        slug = params.get("brandSlug");
        expected = data;
        break;
      }
    }
    assert.ok(slug, "A real brand with two products is required");
    const route = `${base}/brands/${encodeURIComponent(slug)}`;
    await page
      .locator(`main a[href="/brands/${encodeURIComponent(slug)}"]`)
      .click();
    await page.waitForURL(route);
    await page.locator('[data-brand-catalog="true"]').waitFor();
    assert.equal(await desktopBrandLink.getAttribute("aria-current"), "page");
    const response = await page.goto(
      `${route}?brandSlug=missing&brands=other&limit=1`,
      { waitUntil: "networkidle" },
    );
    assert.equal(response.status(), 200);
    assert.equal(
      await page.locator('meta[name="robots"][content*="noindex"]').count(),
      0,
    );
    assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(
      await page
        .locator('[data-brand-catalog="true"]')
        .getAttribute("data-theme"),
      "light",
    );
    const cards = page.locator("[data-arctic-product-card]");
    await cards.first().waitFor();
    assert.equal(
      await page
        .locator("aside summary")
        .filter({ hasText: /^برند$/ })
        .count(),
      0,
    );
    const expectedLinks = new Set(
      expected.items.map((product) => `/products/${product.slug}`),
    );
    async function checkScope() {
      const links = await cards
        .locator('a[href^="/products/"]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
      for (const link of links) assert.ok(expectedLinks.has(link), link);
    }
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Overflow at ${width}`,
      );
      await checkScope();
    }
    await page.screenshot({
      path: join(tmpdir(), "launchox-brand-detail-desktop.png"),
      fullPage: true,
    });
    await page
      .getByRole("combobox", { name: "مرتب‌سازی محصولات" })
      .selectOption("price_asc");
    await page.waitForURL("**/*sort=price_asc*");
    assert.equal(new URL(page.url()).pathname, new URL(route).pathname);
    assert.ok(!new URL(page.url()).searchParams.has("brandSlug"));
    await page.locator("[data-catalog-load-more]").scrollIntoViewIfNeeded();
    await page.waitForFunction(
      (count) =>
        document.querySelectorAll("[data-arctic-product-card]").length ===
        count,
      expected.total,
    );
    await checkScope();
    const categoryButtons = page
      .getByRole("group", { name: "دسته‌بندی محصولات" })
      .getByRole("button");
    if ((await categoryButtons.count()) > 1) {
      await categoryButtons.nth(1).click();
      await page.waitForURL("**/*category=*");
      assert.equal(new URL(page.url()).searchParams.get("sort"), "price_asc");
      assert.ok(!new URL(page.url()).searchParams.has("page"));
      assert.equal(
        await categoryButtons.nth(1).getAttribute("aria-pressed"),
        "true",
      );
      await checkScope();
    }
    await page.setViewportSize({ width: 360, height: 800 });
    const trigger = page.getByRole("button", { name: /^فیلترها/ });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert.equal(
      await dialog
        .locator("summary")
        .filter({ hasText: /^برند$/ })
        .count(),
      0,
    );
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.ok(
      await trigger.evaluate((node) => node === document.activeElement),
    );
    await page.emulateMedia({ colorScheme: "dark" });
    assert.equal(
      await page
        .locator('[data-brand-catalog="true"]')
        .evaluate((node) => getComputedStyle(node).colorScheme),
      "light",
    );
    await page.screenshot({
      path: join(tmpdir(), "launchox-brand-detail-mobile.png"),
      fullPage: true,
    });
    await page.goto(`${base}/brands/brand-that-does-not-exist`, {
      waitUntil: "networkidle",
    });
    await page.getByRole("heading", { name: "برند پیدا نشد" }).waitFor();
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(
      "Brand browser acceptance passed: real data, scoped queries/sort/loading/categories, 360/768/1440 layouts, keyboard dialog, light mode and missing brand.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
