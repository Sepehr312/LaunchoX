import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

// Supply a package.json path whose dependencies include Playwright; no installation paths are embedded.
const require = createRequire(resolve(process.argv[2] ?? "package.json"));
const { chromium } = require("playwright");
const base = process.argv[3] ?? "http://localhost:3026";
const credentials = await readFile(
  new URL("../.env.owner-initial", import.meta.url),
  "utf8",
);
const email = credentials.match(/^OWNER_EMAIL=(.+)$/m)?.[1];
const password = credentials.match(/^OWNER_INITIAL_PASSWORD=(.+)$/m)?.[1];
assert(email && password, "Initial owner credentials are required");
const browser = await chromium.launch({ channel: "msedge", headless: true });
let stage = "login";
try {
  const page = await browser.newPage({
    extraHTTPHeaders: {
      "x-forwarded-for": `127.${[...randomBytes(3)].join(".")}`,
    },
  });
  const errors = [];
  page.on("pageerror", () => errors.push("Browser runtime error"));
  await page.goto(`${base}/login?callbackUrl=/admin/users`);
  await page.getByLabel("ایمیل", { exact: true }).fill(email);
  await page.getByLabel("رمز عبور", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ورود", exact: true }).click();
  await page.waitForURL(`${base}/admin/users`);
  stage = "owner controls";
  const owner = page.locator("tbody tr").filter({ hasText: email });
  assert.equal(await owner.getByRole("switch").count(), 0);
  assert.equal(await owner.getByRole("combobox").count(), 0);
  assert.equal(
    await owner
      .locator("td")
      .nth(2)
      .getByText("ادمین", { exact: true })
      .isVisible(),
    true,
  );
  assert.equal((await owner.locator("td").nth(3).innerText()).trim(), "فعال");
  assert.equal(
    await owner.locator('input[name="confirmationPassword"]').count(),
    0,
  );
  stage = "password dialog";
  assert.equal(
    await page.locator('input[name="confirmationPassword"]').count(),
    0,
  );
  const target = page.locator("tbody tr").filter({ hasNotText: email }).first();
  const roleSelect = target.getByRole("combobox");
  const originalRole = await roleSelect.inputValue();
  await roleSelect.selectOption(
    originalRole === "admin" ? "customer" : "admin",
  );
  const save = target.getByRole("button", { name: /ذخیره نقش/ });
  let mutations = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.headers()["next-action"])
      mutations++;
  });
  await save.click();
  const dialog = page.getByRole("dialog", { name: "تأیید تغییرات توسط مالک" });
  await dialog.waitFor();
  stage = "dialog focus and icon";
  const confirmation = dialog.getByLabel("رمز عبور مالک", { exact: true });
  assert(
    await confirmation.evaluate((input) => document.activeElement === input),
  );
  const eye = dialog.getByRole("button", {
    name: "نمایش رمز عبور مالک",
    exact: true,
  });
  assert(
    await eye.evaluate(
      (button) => getComputedStyle(button).borderWidth === "0px",
    ),
  );
  await eye.click();
  assert.equal(await confirmation.getAttribute("type"), "text");
  await dialog
    .getByRole("button", { name: "مخفی کردن رمز عبور مالک", exact: true })
    .click();
  assert.equal(await confirmation.getAttribute("type"), "password");
  await confirmation.fill("discarded-test-input");
  stage = "dialog cancellation";
  await dialog.getByRole("button", { name: "انصراف", exact: true }).click();
  await dialog.waitFor({ state: "detached" });
  assert.equal(await dialog.count(), 0);
  assert(await save.evaluate((button) => document.activeElement === button));
  await save.click();
  await dialog.waitFor();
  assert.equal(await confirmation.inputValue(), "");
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });
  assert.equal(await dialog.count(), 0);
  assert.equal(mutations, 0);
  for (const width of [360, 768, 1440]) {
    stage = `viewport ${width}`;
    await page.setViewportSize({ width, height: 900 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
    await save.click();
    await dialog.waitFor();
    const box = await dialog.boundingBox();
    assert(box && box.x >= 0 && box.x + box.width <= width);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
  }
  await roleSelect.selectOption(originalRole);
  assert.equal(errors.length, 0);
  console.log(
    "PASS: owner login, protected controls, accessible password dialog, focus restoration, secret clearing, cancel/Escape without mutations and RTL/mobile layout.",
  );
} catch {
  // Playwright call logs can contain fill arguments, so never print raw errors containing credentials.
  console.error(`Owner browser verification failed at ${stage}.`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
