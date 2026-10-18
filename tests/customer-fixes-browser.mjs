import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.LAUNCHO_PLAYWRIGHT_PATH || "playwright",
);
const base = "http://localhost:3024";
const dbName = `launchox_customer_qa_${randomUUID().replaceAll("-", "")}`;
const artifacts = "docs/customer-review";
const password = randomUUID() + "A1!";
let server;
let browser;
let output = "";
const results = [];
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
        ...process.env,
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
      process.env.LAUNCHO_CHROME_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    colorScheme: "dark",
  });
  const page = await context.newPage();
  async function layout(path, name) {
    await page.goto(base + path);
    await page.locator("body").waitFor();
    await page.evaluate(() => document.fonts.ready);
    const dimensions = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      scheme: getComputedStyle(document.documentElement).colorScheme,
      background: getComputedStyle(document.body).backgroundImage,
    }));
    assert(
      dimensions.scroll <= dimensions.width,
      `${path}: horizontal overflow ${JSON.stringify(dimensions)}`,
    );
    assert.equal(dimensions.scheme, "light");
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: `${artifacts}/${name}-360.png`,
      fullPage: true,
    });
    results.push({ path, ...dimensions });
    return dimensions.background;
  }
  async function login(email) {
    await page.goto(`${base}/login?callbackUrl=%2Fcheckout`);
    await page.getByRole("checkbox").check();
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "ورود", exact: true }).click();
  }
  const background = await layout("/products", "products");
  assert.equal(await layout("/login", "login"), background);
  await page.getByRole("checkbox").check();
  await login("customer@example.com");
  await page.waitForURL(`${base}/checkout`).catch(async (error) => {
    console.error(
      "Customer URL:",
      page.url(),
      "Body:",
      await page.locator("body").innerText(),
      "Server output:",
      output,
    );
    throw error;
  });
  assert.equal(
    await page.evaluate(() =>
      sessionStorage.getItem("launchox-remember-email"),
    ),
    "customer@example.com",
  );
  for (const [path, name] of [
    ["/account", "account"],
    ["/account/addresses", "addresses"],
    ["/account/orders", "orders"],
    ["/cart", "cart"],
    ["/checkout", "checkout"],
  ]) {
    assert.equal(await layout(path, name), background);
  }
  for (const order of orders) {
    await layout(`/account/orders/${order._id}`, order.status);
    const text = await page.locator("main").innerText();
    if (order.payment.status !== "paid") assert(!text.includes("حدود ۱ هفته"));
    if (["processing", "shipped"].includes(order.status))
      assert(text.includes("حدود ۱ هفته"));
    if (order.status === "delivered")
      assert(text.includes("سفارش شما تحویل داده شده است"));
    if (order.status === "cancelled")
      assert(text.includes("این سفارش لغو شده است"));
  }
  const otherOrder = {
    ...orders[0],
    _id: new mongoose.Types.ObjectId(),
    user: new mongoose.Types.ObjectId(),
    orderNumber: "LX-200001",
  };
  await db.collection("orders").insertOne(otherOrder);
  const forbidden = await page.goto(`${base}/account/orders/${otherOrder._id}`);
  assert.equal(
    forbidden.status(),
    404,
    "Customer could read another customer's order",
  );
  // Break only an isolated fixture, then repair it without navigating: retry must fetch fresh server data.
  const broken = orders[0];
  await db
    .collection("orders")
    .updateOne({ _id: broken._id }, { $unset: { shippingAddress: "" } });
  await page.goto(`${base}/account/orders/${broken._id}`);
  const retry = page.getByRole("button", { name: "تلاش مجدد", exact: true });
  await retry.waitFor();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: `${artifacts}/retry-error-360.png`,
    fullPage: true,
  });
  await db.collection("orders").updateOne(
    { _id: broken._id },
    {
      $set: {
        shippingAddress: {
          ...address,
          recipientName: "اطلاعات تازه از سرور",
        },
      },
    },
  );
  let refreshRequests = 0;
  page.on("request", (request) => {
    if (request.headers().rsc === "1") refreshRequests++;
  });
  await retry.click();
  await page.getByText("اطلاعات تازه از سرور", { exact: true }).waitFor();
  assert(
    refreshRequests > 0,
    "Retry did not fetch a server component response",
  );
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: `${artifacts}/retry-recovered-360.png`,
    fullPage: true,
  });
  await context.close();
  await writeFile(
    `${artifacts}/results.json`,
    JSON.stringify(
      {
        viewport: "360x800",
        results,
        retry: { refreshRequests, recoveredWithoutNavigation: true },
        ownership: "other customer order returns 404",
        deliveryStates: orders.map((o) => [o.status, o.payment.status]),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Customer browser checks passed: 360px layouts, shared light background, delivery states, retry server refresh, email storage.",
  );
} finally {
  await browser?.close();
  server?.kill();
  if (mongoose.connection.db) await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
}
