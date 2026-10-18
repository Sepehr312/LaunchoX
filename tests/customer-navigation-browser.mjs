import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || "playwright");
const base = "http://localhost:3024";
const dbName = `launchox_customer_qa_${randomUUID().replaceAll("-", "")}`;
const artifacts = "docs/customer-review/navigation";
const password = randomUUID() + "A1!";
let server;
let browser;
let output = "";
try {
  await mkdir(artifacts, { recursive: true });
  await mongoose.connect(`mongodb://127.0.0.1:27017/${dbName}`);
  const db = mongoose.connection.db;
  const customerId = new mongoose.Types.ObjectId();
  const hash = await bcrypt.hash(password, 12);
  await db.collection("users").insertMany([
    {
      _id: customerId,
      name: "مشتری آزمایشی",
      email: "customer@example.com",
      passwordHash: hash,
      role: "customer",
      isActive: true,
      addresses: [],
    },
  ]);
  const address = {
    title: "خانه",
    recipientName: "مشتری آزمایشی",
    mobile: "09123456789",
    province: "تهران",
    city: "تهران",
    postalCode: "1234567890",
    addressLine: "خیابان نمونه، پلاک ۱",
    isDefault: true,
  };
  const now = new Date();
  const orders = [
    ["pending", "unpaid"],
    ["processing", "paid"],
    ["shipped", "paid"],
    ["delivered", "paid"],
    ["cancelled", "failed"],
  ].map(([status, payment], index) => ({
    _id: new mongoose.Types.ObjectId(),
    orderNumber: `LX-${100001 + index}`,
    user: customerId,
    items: [],
    subtotal: 100000,
    shippingFee: 0,
    total: 100000,
    shippingAddress: address,
    status,
    payment: { status: payment },
    statusHistory: [{ status, changedAt: now }],
    createdAt: now,
    updatedAt: now,
  }));
  await db.collection("orders").insertMany(orders);
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", "3024"],
    {
      env: {
        NODE_ENV: "production",
        MONGODB_URI: `mongodb://127.0.0.1:27017/${dbName}`,
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
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error(output);
    try {
      if ((await fetch(`${base}/api/health`)).ok) break;
    } catch {}
    await delay(500);
  }
  browser = await chromium.launch({
    executablePath:
      process.argv[3] ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const checks = [];
  async function until(fn, message) {
    for (let attempt = 0; attempt < 50; attempt++) {
      if (await fn()) return;
      await delay(50);
    }
    throw new Error(message);
  }
  async function check(name, fn) {
    await fn();
    checks.push(name);
    console.log("PASS", name);
  }
  async function shot(name) {
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `${artifacts}/${name}.png`, fullPage: true });
  }
  await page.goto(base + "/login");
  await page.locator('[name="email"]').fill("customer@example.com");
  await page.locator('[name="password"]').fill(password);
  await page.getByRole("button", { name: "ورود", exact: true }).click();
  await page.waitForURL(base + "/account");
  const sidebar = page.getByRole("complementary", {
    name: "ناوبری حساب مشتری",
  });
  const shell = page.locator("main[data-sidebar-expanded]");
  const content = shell.locator(":scope > div.min-w-0");
  await check("desktop sidebar is on the right", async () => {
    const side = await sidebar.boundingBox();
    const body = await content.boundingBox();
    assert(
      side.x >= body.x + body.width,
      "Sidebar is not to the right of content",
    );
    assert.equal(
      await page
        .getByRole("button", { name: "جمع کردن منوی حساب", exact: true })
        .getAttribute("aria-expanded"),
      "true",
    );
    await shot("desktop-expanded");
  });
  await check("desktop collapse expands content and reopens", async () => {
    const before = (await content.boundingBox()).width;
    await page
      .getByRole("button", { name: "جمع کردن منوی حساب", exact: true })
      .click();
    assert.equal(await sidebar.getByRole("navigation").count(), 0);
    const after = (await content.boundingBox()).width;
    assert(after > before, "Content did not gain space");
    await shot("desktop-collapsed");
    await page
      .getByRole("button", { name: "باز کردن منوی حساب", exact: true })
      .click();
    assert(await sidebar.getByRole("navigation").isVisible());
  });
  await check(
    "desktop links retain active states and account content",
    async () => {
      await sidebar
        .getByRole("link", { name: "آدرس‌های من", exact: true })
        .click();
      await page.waitForURL(base + "/account/addresses");
      assert.equal(
        await sidebar
          .getByRole("link", { name: "آدرس‌های من", exact: true })
          .getAttribute("aria-current"),
        "page",
      );
    },
  );
  await page.setViewportSize({ width: 360, height: 800 });
  const trigger = page.getByRole("button", { name: "منوی حساب", exact: true });
  const drawer = page.getByRole("dialog", { name: "منوی حساب مشتری" });
  async function open() {
    await trigger.click();
    await drawer.waitFor();
  }
  await check(
    "mobile drawer opens from the right with no horizontal overflow",
    async () => {
      assert(!(await sidebar.isVisible()));
      await open();
      assert.equal(await trigger.getAttribute("aria-expanded"), "true");
      const d = await drawer.boundingBox();
      assert(
        Math.abs(d.x + d.width - 360) < 2,
        `Drawer is not aligned right: ${JSON.stringify(d)}`,
      );
      assert(
        (await page.evaluate(() => document.documentElement.scrollWidth)) <=
          360,
      );
      assert.equal(
        await page.evaluate(() => document.body.style.overflow),
        "hidden",
      );
      await shot("mobile-open");
    },
  );
  await check(
    "dialog focus stays inside and Escape restores the trigger",
    async () => {
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press("Tab");
        assert(
          await drawer.evaluate((d) => d.contains(document.activeElement)),
          "Focus escaped the modal",
        );
      }
      await page.keyboard.press("Escape");
      await drawer.waitFor({ state: "hidden" });
      await until(
        async () => (await trigger.getAttribute("aria-expanded")) === "false",
        "Trigger did not reflect the closed dialog",
      );
      assert(await trigger.evaluate((e) => e === document.activeElement));
      assert.notEqual(
        await page.evaluate(() => document.body.style.overflow),
        "hidden",
      );
      await shot("mobile-closed");
    },
  );
  await check("mobile links close the drawer and navigate", async () => {
    await open();
    await drawer
      .getByRole("link", { name: "سفارش‌های من", exact: true })
      .click();
    await page.waitForURL(base + "/account/orders");
    await drawer.waitFor({ state: "hidden" });
    await open();
    assert.equal(
      await drawer
        .getByRole("link", { name: "سفارش‌های من", exact: true })
        .getAttribute("aria-current"),
      "page",
    );
    await drawer
      .getByRole("button", { name: "بستن منوی حساب", exact: true })
      .click();
    await drawer.waitFor({ state: "hidden" });
  });
  await check("backdrop closes the mobile drawer", async () => {
    await open();
    await page.mouse.click(8, 400);
    await drawer.waitFor({ state: "hidden" });
  });
  await check(
    "resizing to desktop closes the modal and restores scrolling",
    async () => {
      await open();
      await page.setViewportSize({ width: 1440, height: 1000 });
      await drawer.waitFor({ state: "hidden" });
      assert(await sidebar.isVisible());
      assert.notEqual(
        await page.evaluate(() => document.body.style.overflow),
        "hidden",
      );
    },
  );
  await check("account layouts fit all design breakpoints", async () => {
    for (const width of [360, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of [
        "/account",
        "/account/addresses",
        "/account/orders",
      ]) {
        await page.goto(base + path);
        await page.evaluate(() => document.fonts.ready);
        assert(
          (await page.evaluate(() => document.documentElement.scrollWidth)) <=
            width,
          `${path} overflows ${width}`,
        );
      }
    }
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await check("touch interaction works on a 360px mobile device", async () => {
    const touchContext = await browser.newContext({
      storageState: await context.storageState(),
      viewport: { width: 360, height: 800 },
      isMobile: true,
      hasTouch: true,
    });
    const touch = await touchContext.newPage();
    await touch.goto(base + "/account");
    await touch.getByRole("button", { name: "منوی حساب", exact: true }).tap();
    const modal = touch.getByRole("dialog", { name: "منوی حساب مشتری" });
    await modal.getByRole("link", { name: "آدرس‌های من", exact: true }).tap();
    await touch.waitForURL(base + "/account/addresses");
    await modal.waitFor({ state: "hidden" });
    assert(
      (await touch.evaluate(() => document.documentElement.scrollWidth)) <= 360,
    );
    await touch.getByRole("button", { name: "منوی حساب", exact: true }).tap();
    await touch.screenshot({
      path: `${artifacts}/mobile-touch-open.png`,
      fullPage: true,
    });
    await touch.setViewportSize({ width: 360, height: 480 });
    const logout = modal.getByRole("button", {
      name: "خروج از حساب",
      exact: true,
    });
    await logout.scrollIntoViewIfNeeded();
    const target = await logout.boundingBox();
    assert(
      target.y >= 0 && target.y + target.height <= 480,
      "Logout is unreachable on a short mobile screen",
    );
    await modal
      .getByRole("button", { name: "بستن منوی حساب", exact: true })
      .tap();
    await modal.waitFor({ state: "hidden" });
    await touchContext.close();
  });
  await check("logout is accessible from the mobile menu", async () => {
    await open();
    await drawer
      .getByRole("button", { name: "خروج از حساب", exact: true })
      .click();
    await page.waitForURL(base + "/");
    await page.goto(base + "/account");
    assert(new URL(page.url()).pathname === "/login");
  });
  await writeFile(
    `${artifacts}/results.json`,
    JSON.stringify({ checks }, null, 2) + "\n",
  );
  await context.close();
} finally {
  await browser?.close();
  server?.kill();
  if (mongoose.connection.db) await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
}
