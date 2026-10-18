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
const artifacts = "docs/customer-review/account-fixes";
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
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db
    .collection("users")
    .createIndex({ mobile: 1 }, { unique: true, sparse: true });
  const addressId = new mongoose.Types.ObjectId();
  await db.collection("users").updateOne(
    { _id: customerId },
    {
      $set: { addresses: [{ ...address, _id: addressId, isDefault: true }] },
    },
  );
  await db.collection("users").insertOne({
    name: "مشتری دیگر",
    email: "other@example.com",
    mobile: "09121111111",
    passwordHash: hash,
    role: "customer",
    isActive: true,
    addresses: [],
  });
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
  });
  let page = await context.newPage();
  const passed = [];
  async function until(fn, message) {
    for (let i = 0; i < 70; i++) {
      if (await fn()) return;
      await delay(150);
    }
    throw new Error(message);
  }
  async function check(name, fn) {
    await fn();
    passed.push(name);
    console.log("PASS", name);
  }
  async function shot(name) {
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `${artifacts}/${name}.png`, fullPage: true });
  }
  function form(operation) {
    return page.locator(
      `form:has(input[name="operation"][value="${operation}"])`,
    );
  }
  const rememberKey = "launchox-remember-email";
  await check(
    "email preference updates immediately and survives only this tab",
    async () => {
      await page.goto(base + "/login");
      await page.locator('[name="email"]').fill("Customer@Example.com");
      await page.getByRole("checkbox").check();
      assert.equal(
        await page.evaluate((k) => sessionStorage.getItem(k), rememberKey),
        "customer@example.com",
      );
      await page.reload();
      await page.waitForFunction(
        () =>
          document.querySelector('[name="email"]')?.value ===
          "customer@example.com",
      );
      await page.getByRole("checkbox").uncheck();
      assert.equal(
        await page.locator('[name="email"]').inputValue(),
        "customer@example.com",
      );
      assert.equal(
        await page.evaluate((k) => sessionStorage.getItem(k), rememberKey),
        null,
      );
      await page.reload();
      assert.equal(await page.locator('[name="email"]').inputValue(), "");
      assert(!(await page.getByRole("checkbox").isChecked()));
      await page.locator('[name="email"]').fill("saved@example.com");
      await page.getByRole("checkbox").check();
      await page.locator('[name="email"]').fill("updated@example.com");
      assert.equal(
        await page.evaluate((k) => sessionStorage.getItem(k), rememberKey),
        "updated@example.com",
      );
      await page.close();
      page = await context.newPage();
      await page.goto(base + "/login");
      assert.equal(
        await page.evaluate((k) => sessionStorage.getItem(k), rememberKey),
        null,
      );
      assert.equal(await page.locator('[name="email"]').inputValue(), "");
    },
  );
  await check(
    "failed registration preserves the login email preference",
    async () => {
      await page.locator('[name="email"]').fill("saved@example.com");
      await page.getByRole("checkbox").check();
      await page.goto(base + "/register");
      for (const [name, value] of Object.entries({
        name: "مشتری آزمایشی",
        email: "customer@example.com",
        password,
        confirmPassword: password,
      }))
        await page.locator(`[name="${name}"]`).fill(value);
      await page
        .getByRole("button", { name: "ساخت حساب کاربری", exact: true })
        .tap();
      await page
        .getByText("این ایمیل قبلاً ثبت شده است", { exact: true })
        .waitFor();
      assert.equal(
        await page.evaluate((k) => sessionStorage.getItem(k), rememberKey),
        "saved@example.com",
      );
    },
  );
  await page.goto(base + "/login");
  await page.locator('[name="email"]').fill("customer@example.com");
  await page.locator('[name="password"]').fill(password);
  await page.getByRole("button", { name: "ورود", exact: true }).tap();
  await page.waitForURL(base + "/account");
  await check("server rejection preserves profile drafts", async () => {
    const f = form("profile");
    await f.locator('[name="name"]').fill("نامی که هنوز ذخیره نشده");
    await f.locator('[name="mobile"]').fill("09121111111");
    await f.getByRole("button").tap();
    await page
      .getByText("این شمارهٔ موبایل قبلاً ثبت شده است", { exact: true })
      .waitFor();
    assert.equal(
      await f.locator('[name="name"]').inputValue(),
      "نامی که هنوز ذخیره نشده",
    );
    assert.equal(
      await f.locator('[name="mobile"]').inputValue(),
      "09121111111",
    );
    await shot("profile-rejected-draft-360");
  });
  await check(
    "saved profile updates the sidebar immediately and after reload",
    async () => {
      const f = form("profile");
      await f.locator('[name="name"]').fill("نام تازه مشتری");
      await f.locator('[name="mobile"]').fill("");
      await f.getByRole("button").tap();
      await until(
        async () =>
          (await page.locator("main aside").innerText()).includes(
            "نام تازه مشتری",
          ),
        "Sidebar did not update",
      );
      await page.reload();
      assert(
        (await page.locator("main aside").innerText()).includes(
          "نام تازه مشتری",
        ),
      );
      await shot("profile-updated-360");
    },
  );
  await page.goto(base + "/account/addresses");
  await check(
    "reopened address editor keeps saved values and cannot revert them",
    async () => {
      const section = page.locator("section.checkout-panel").filter({
        has: page.getByRole("heading", { name: "خانه", exact: true }),
      });
      await section.getByText("ویرایش آدرس", { exact: true }).tap();
      await form("edit")
        .locator('[name="addressLine"]')
        .fill("نشانی تازه آزمایشی، پلاک ۹");
      await form("edit").getByRole("button").tap();
      await until(
        async () =>
          (await db.collection("users").findOne({ _id: customerId }))
            .addresses[0].addressLine === "نشانی تازه آزمایشی، پلاک ۹",
        "Edit did not save",
      );
      await until(
        async () => !(await section.locator("details").evaluate((e) => e.open)),
        "Editor did not close",
      );
      await section.getByText("ویرایش آدرس", { exact: true }).tap();
      assert.equal(
        await form("edit").locator('[name="addressLine"]').inputValue(),
        "نشانی تازه آزمایشی، پلاک ۹",
      );
      await form("edit").getByRole("button").tap();
      await until(
        async () => !(await section.locator("details").evaluate((e) => e.open)),
        "Second save did not close",
      );
      assert.equal(
        (await db.collection("users").findOne({ _id: customerId })).addresses[0]
          .addressLine,
        "نشانی تازه آزمایشی، پلاک ۹",
      );
    },
  );
  async function fillAddress(f, title) {
    for (const [name, value] of Object.entries({
      title,
      recipientName: "علی رضایی",
      mobile: "۰۹۱۲۳۴۵۶۷۸۹",
      postalCode: "۱۲۳۴۵۶۷۸۹۰",
      addressLine: "خیابان نمونه، پلاک ۱۲",
    }))
      await f.locator(`[name="${name}"]`).fill(value);
    await f.locator('[name="province"]').selectOption({ label: "تهران" });
    await f.locator('[name="city"]').selectOption({ label: "تهران" });
  }
  await check(
    "successful address addition still resets all controlled fields",
    async () => {
      await fillAddress(form("add"), "محل کار");
      await form("add").getByRole("button").tap();
      await until(
        async () =>
          (await db.collection("users").findOne({ _id: customerId })).addresses
            .length === 2,
        "Address not added",
      );
      await until(
        async () =>
          (await form("add").locator('[name="title"]').inputValue()) === "",
        "Addition did not reset",
      );
      assert.equal(
        await form("add").locator('[name="province"]').inputValue(),
        "",
      );
    },
  );
  await check(
    "server-rejected address addition preserves controlled fields",
    async () => {
      await fillAddress(form("add"), "نشانی حفظ‌شده");
      await db.collection("users").updateOne(
        { _id: customerId },
        {
          $push: {
            addresses: {
              $each: Array.from({ length: 3 }, (_, i) => ({
                ...address,
                _id: new mongoose.Types.ObjectId(),
                title: `نشانی ${i + 3}`,
                isDefault: false,
              })),
            },
          },
        },
      );
      await form("add").getByRole("button").tap();
      await page
        .getByText("افزودن آدرس ممکن نیست؛ حداکثر ۵ آدرس مجاز است", {
          exact: true,
        })
        .waitFor();
      assert.equal(
        await form("add").locator('[name="title"]').inputValue(),
        "نشانی حفظ‌شده",
      );
      assert.equal(
        await form("add").locator('[name="city"]').inputValue(),
        "تهران",
      );
    },
  );
  await check("long address stays inside the mobile viewport", async () => {
    await page.reload();
    const section = page.locator("section.checkout-panel").filter({
      has: page.getByRole("heading", { name: "خانه", exact: true }),
    });
    await section.getByText("ویرایش آدرس", { exact: true }).tap();
    await section.locator('[name="addressLine"]').fill("خیابان".repeat(100));
    await section
      .locator('form:has(input[value="edit"])')
      .getByRole("button")
      .tap();
    await until(
      async () =>
        (await db.collection("users").findOne({ _id: customerId })).addresses[0]
          .addressLine.length === 600,
      "Long address did not save",
    );
    await page.reload();
    await shot("long-address-wrapped-360");
    assert(
      (await page.evaluate(() => document.documentElement.scrollWidth)) <= 360,
    );
  });
  await check("copy target is at least 44px", async () => {
    await page.goto(`${base}/account/orders/${orders[0]._id}`);
    const d = await page
      .getByRole("button", { name: "کپی شماره سفارش", exact: true })
      .boundingBox();
    assert(d.width >= 44 && d.height >= 44);
  });
  await check("password form resets only after successful update", async () => {
    await page.goto(base + "/account");
    await page.getByText("تغییر رمز عبور", { exact: true }).tap();
    const f = form("password");
    for (const [name, value] of Object.entries({
      currentPassword: "WrongPassword123!",
      password: "ChangedPassword123!",
      confirmPassword: "ChangedPassword123!",
    }))
      await f.locator(`[name="${name}"]`).fill(value);
    await f.getByRole("button", { name: "ذخیرهٔ رمز جدید", exact: true }).tap();
    await page.getByText("رمز عبور فعلی صحیح نیست", { exact: true }).waitFor();
    assert.equal(
      await f.locator('[name="password"]').inputValue(),
      "ChangedPassword123!",
    );
    await f.locator('[name="currentPassword"]').fill(password);
    await f.getByRole("button", { name: "ذخیرهٔ رمز جدید", exact: true }).tap();
    await until(
      async () =>
        await bcrypt.compare(
          "ChangedPassword123!",
          (await db.collection("users").findOne({ _id: customerId }))
            .passwordHash,
        ),
      "Password did not change",
    );
    await until(
      async () => (await f.locator('[name="password"]').inputValue()) === "",
      "Password form did not reset",
    );
    assert.equal(await f.locator('[name="currentPassword"]').inputValue(), "");
  });
  await check(
    "customer pages fit design breakpoints with long content",
    async () => {
      for (const width of [360, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const path of [
          "/account",
          "/account/addresses",
          "/account/orders",
          "/cart",
          "/checkout",
        ]) {
          await page.goto(base + path);
          await page.evaluate(() => document.fonts.ready);
          assert(
            (await page.evaluate(() => document.documentElement.scrollWidth)) <=
              width,
            `${path} overflows ${width}px`,
          );
        }
      }
    },
  );
  await writeFile(
    `${artifacts}/results.json`,
    JSON.stringify({ passed, viewports: [360, 768, 1024, 1440] }, null, 2) +
      "\n",
  );
  await context.close();
} finally {
  await browser?.close();
  server?.kill();
  if (mongoose.connection.db) await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
}
