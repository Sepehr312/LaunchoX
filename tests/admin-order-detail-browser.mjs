import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { mkdir } from "node:fs/promises";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.LAUNCHO_PLAYWRIGHT_PATH || "playwright",
);
const databaseName = `launchox_order_detail_${randomUUID().replaceAll("-", "")}`;
const base = "http://localhost:3025";
let server;
let browser;
let output = "";
try {
  await mongoose.connect(`mongodb://127.0.0.1:27017/${databaseName}`);
  const db = mongoose.connection.db;
  const now = new Date();
  const passwordHash = await bcrypt.hash("Browser123!", 12);
  const admin = (
    await db
      .collection("users")
      .insertOne({
        name: "مدیر فروشگاه",
        email: "detail-admin@example.com",
        passwordHash,
        role: "admin",
        isActive: true,
        addresses: [],
        createdAt: now,
        updatedAt: now,
      })
  ).insertedId;
  const customer = (
    await db
      .collection("users")
      .insertOne({
        name: "سارا حسینی",
        email: "sara@example.com",
        passwordHash,
        role: "customer",
        isActive: true,
        addresses: [],
        createdAt: now,
        updatedAt: now,
      })
  ).insertedId;
  const product = (
    await db
      .collection("products")
      .insertOne({
        title: "یخچال سایدبای‌ساید X900",
        stock: 5,
        slug: "detail-product",
        price: 42800000,
        isActive: true,
      })
  ).insertedId;
  const states = ["processing", "pending", "delivered", "cancelled", "pending"];
  const orders = await db.collection("orders").insertMany(
    states.map((status, i) => ({
      orderNumber: `LX-${100124 + i}`,
      user: customer,
      shippingAddress: {
        recipientName: "سارا حسینی",
        mobile: "09123456789",
        province: "تهران",
        city: "تهران",
        addressLine: "سعادت‌آباد، خیابان سرو، پلاک ۱۲",
        postalCode: "1998765432",
      },
      items: [
        {
          product,
          title: "یخچال سایدبای‌ساید X900",
          slug: "detail-product",
          image: "/images/preview/categories/side-by-side.png",
          price: 42800000,
          quantity: 1,
        },
        {
          product: new mongoose.Types.ObjectId(),
          title: "یخچال مینی",
          slug: "detail-mini",
          image: "/images/preview/categories/mini.png",
          price: 8200000,
          quantity: 1,
        },
      ],
      subtotal: 51000000,
      shippingFee: 300000,
      total: 51300000,
      status,
      note: "قبل از تحویل تماس بگیرید.",
      payment: {
        status: i === 1 ? "unpaid" : i === 3 ? "failed" : "paid",
        provider: "fake",
        authority: randomUUID(),
        ...(i !== 1 && i !== 3
          ? { refId: "REFERENCE-123456", paidAt: now }
          : {}),
      },
      statusHistory: [
        {
          status: "pending",
          changedAt: new Date(now.getTime() - 600000),
          changedBy: customer,
        },
        ...(status !== "pending"
          ? [{ status, changedAt: now, changedBy: admin }]
          : []),
      ],
      createdAt: now,
      updatedAt: now,
    })),
  );
  const ids = Object.values(orders.insertedIds).map(String);
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", "3025"],
    {
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "production",
        MONGODB_URI: `mongodb://127.0.0.1:27017/${databaseName}`,
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
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error(output);
    try {
      if ((await fetch(`${base}/api/health`)).ok) break;
    } catch {
      /* Wait for the isolated server. */
    }
    await delay(1000);
  }
  browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/admin/orders/${ids[0]}`);
  assert.ok(page.url().includes("/login"));
  await page
    .getByLabel("ایمیل", { exact: true })
    .fill("detail-admin@example.com");
  await page.getByLabel("رمز عبور", { exact: true }).fill("Browser123!");
  await page.getByRole("button", { name: "ورود", exact: true }).click();
  await page.waitForURL(`${base}/admin/orders/${ids[0]}`);
  await page
    .getByRole("heading", { name: "اقلام سفارش", exact: true })
    .waitFor();
  assert.equal(
    await page.locator('[aria-current="step"]').innerText(),
    "آماده‌سازی",
  );
  await page
    .getByRole("button", { name: "کپی شماره سفارش", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    "LX-100124",
  );
  const details = page.locator("details");
  assert.equal(await details.getAttribute("open"), null);
  await details.locator("summary").click();
  await page
    .getByRole("button", { name: "کپی شناسه پرداخت", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    "REFERENCE-123456",
  );
  await details.locator("summary").click();
  const filterQuery =
    "?q=" +
    encodeURIComponent("سارا") +
    "&status=processing&payment=paid&period=7";
  await page.goto(`${base}/admin/orders${filterQuery}`);
  await page
    .getByRole("link", { name: "بررسی سفارش LX-۱۰۰۱۲۴", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "اقلام سفارش", exact: true })
    .waitFor();
  const back = new URL(
    await page
      .getByRole("link", { name: "بازگشت به سفارش‌ها", exact: true })
      .getAttribute("href"),
    base,
  );
  assert.equal(back.searchParams.get("q"), "سارا");
  assert.equal(back.searchParams.get("status"), "processing");
  assert.equal(back.searchParams.get("payment"), "paid");
  await mkdir("docs/admin-review", { recursive: true });
  for (const width of [1440, 1024, 768, 360]) {
    await page.setViewportSize({ width, height: 1200 });
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
      return document.fonts.ready;
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Overflow at ${width}px`,
    );
    if (width === 360) {
      const action = await page
        .getByRole("region", { name: "اقدام بعدی", exact: true })
        .boundingBox();
      const items = await page
        .getByRole("region", { name: "اقلام سفارش", exact: true })
        .boundingBox();
      assert.ok(action.y < items.y);
    }
    if (width === 1440 || width === 360)
      await page.screenshot({
        path: `docs/admin-review/order-detail-approved-${width}.png`,
        fullPage: true,
      });
  }
  await page
    .getByRole("button", { name: "ثبت ارسال سفارش", exact: true })
    .click();
  await page
    .getByRole("button", { name: "تأیید تحویل سفارش", exact: true })
    .waitFor();
  let updated = await db
    .collection("orders")
    .findOne({ _id: new mongoose.Types.ObjectId(ids[0]) });
  assert.equal(updated.status, "shipped");
  assert.equal(String(updated.statusHistory.at(-1).changedBy), String(admin));
  assert.equal(
    await page.getByRole("button", { name: "لغو سفارش", exact: true }).count(),
    0,
  );
  await page
    .getByRole("button", { name: "تأیید تحویل سفارش", exact: true })
    .click();
  await page
    .getByText("این سفارش تغییر وضعیت دیگری ندارد.", { exact: true })
    .waitFor();
  assert.equal(
    (
      await db
        .collection("orders")
        .findOne({ _id: new mongoose.Types.ObjectId(ids[0]) })
    ).status,
    "delivered",
  );
  await page.goto(`${base}/admin/orders/${ids[1]}`);
  await page
    .getByText("سفارش در انتظار پرداخت مشتری است.", { exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "شروع آماده‌سازی", exact: true })
      .count(),
    0,
  );
  const cancel = page.getByRole("button", { name: "لغو سفارش", exact: true });
  await cancel.evaluate((button) => {
    button.value = "shipped";
  });
  await cancel.click();
  await page.locator('p[role="alert"]').waitFor();
  assert.equal(
    (
      await db
        .collection("orders")
        .findOne({ _id: new mongoose.Types.ObjectId(ids[1]) })
    ).status,
    "pending",
  );
  await page.reload();
  await cancel.click();
  const modal = page.getByRole("dialog", { name: "لغو سفارش", exact: true });
  await modal.waitFor();
  assert.equal(
    await modal
      .getByRole("button", { name: "بازگشت", exact: true })
      .evaluate((element) => element === document.activeElement),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(await modal.count(), 0);
  assert.equal(
    (await db.collection("products").findOne({ _id: product })).stock,
    5,
  );
  await cancel.click();
  await modal
    .getByRole("button", { name: "بله، لغو سفارش", exact: true })
    .click();
  await page.getByText("این سفارش لغو شده است.", { exact: false }).waitFor();
  assert.equal(
    (await db.collection("products").findOne({ _id: product })).stock,
    6,
  );
  await page.reload();
  assert.equal(
    (await db.collection("products").findOne({ _id: product })).stock,
    6,
  );
  await page.goto(`${base}/admin/orders/${ids[4]}`);
  await page
    .getByRole("button", { name: "شروع آماده‌سازی", exact: true })
    .click();
  await page
    .getByRole("button", { name: "ثبت ارسال سفارش", exact: true })
    .waitFor();
  await page.goto(`${base}/admin/orders/not-an-id`);
  await page
    .getByText("صفحه یا مورد موردنظر پیدا نشد", { exact: false })
    .first()
    .waitFor();
  await db.collection("users").deleteOne({ _id: customer });
  await db
    .collection("orders")
    .updateOne(
      { _id: new mongoose.Types.ObjectId(ids[2]) },
      { $set: { items: [], statusHistory: [] }, $unset: { "payment.paidAt": "" } },
    );
  await page.goto(`${base}/admin/orders/${ids[2]}`);
  await page.getByText("مشتری حذف‌شده", { exact: true }).waitFor();
  await page
    .getByText("اقلامی برای این سفارش ثبت نشده است.", { exact: true })
    .waitFor();
  await page
    .getByText("تاریخچه‌ای برای این سفارش ثبت نشده است.", { exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: approved detail layout at four widths, clipboard, disclosure, filter-preserving return, legal transitions/actor, unpaid tamper rejection, cancellation modal/Escape/stock, terminal and missing-data states, guest/invalid-ID guards; screenshots saved.",
  );
} catch (error) {
  console.error(output.slice(-3000));
  throw error;
} finally {
  await browser?.close();
  server?.kill();
  if (mongoose.connection.db?.databaseName === databaseName)
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
