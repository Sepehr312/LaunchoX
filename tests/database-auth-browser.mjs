import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
import assert from "node:assert/strict";
(async () => {
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-proxy-server"],
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const base = process.env.LAUNCHO_AUTH_TEST_URL || "http://127.0.0.1:3032";
  await page.goto(base + "/account");
  assert(page.url().includes("/login"));
  await page.goto(base + "/register");
  const email = "verify-" + Date.now() + "@example.com";
  await page
    .getByLabel("نام و نام خانوادگی", { exact: true })
    .fill("کاربر آزمایشی");
  await page.getByLabel("ایمیل", { exact: true }).fill(email);
  await page.getByLabel("رمز عبور", { exact: true }).fill("VerifyCustomer123!");
  await page
    .getByLabel("تکرار رمز عبور", { exact: true })
    .fill("VerifyCustomer123!");
  await page
    .getByRole("button", { name: /^(ساخت حساب کاربری|ثبت‌نام)$/ })
    .click();
  await page.waitForURL(base + "/account");
  const session = await (
    await context.request.get(base + "/api/auth/session")
  ).json();
  assert.equal(session.user.role, "customer");
  assert(!JSON.stringify(session).includes("password"));
  await page.goto(base + "/account/addresses");
  assert(!page.url().includes("/login"));
  await page.goto(base + "/account/orders");
  assert(!page.url().includes("/login"));
  const denied = await page.goto(base + "/admin");
  assert.equal(denied.status(), 404);
  await page.goto(base + "/account");
  await page.getByRole("button", { name: /^خروج(?: از حساب)?$/ }).click();
  await page.waitForURL(base + "/");
  await page.goto(base + "/login");
  await page.getByLabel("ایمیل", { exact: true }).fill(email);
  await page.getByLabel("رمز عبور", { exact: true }).fill("VerifyCustomer123!");
  await page.getByRole("button", { name: "ورود", exact: true }).click();
  await page.waitForURL(base + "/account");
  console.log(
    "PASS: guest protection, registration, customer role, session redaction, addresses, orders, admin denial, logout and login",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
