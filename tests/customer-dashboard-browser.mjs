import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { startTestMongo } from "./mongo-server.ts";

const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.LAUNCHO_PLAYWRIGHT_PATH || "playwright",
);
const mongo = await startTestMongo();
const artifacts = await mkdtemp(join(tmpdir(), "launchox-customer-dashboard-"));
const reservation = createServer();
await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const base = `http://127.0.0.1:${port}`;
const password = randomUUID() + "A1!";
let server;
let browser;
let output = "";
try {
  await mongoose.connect(mongo.uri, { dbName: "customer_dashboard_browser" });
  const db = mongoose.connection.db;
  const user = new mongoose.Types.ObjectId();
  const other = new mongoose.Types.ObjectId();
  const address = {
    _id: new mongoose.Types.ObjectId(),
    title: "خانه",
    recipientName: "سپهر احمدی",
    mobile: "09123456789",
    province: "تهران",
    city: "تهران",
    addressLine: "خیابان ولیعصر، پلاک ۲۴",
    postalCode: "1234567890",
    isDefault: true,
  };
  await db.collection("users").insertOne({
    _id: user,
    name: "سپهر احمدی",
    email: "dashboard@example.com",
    passwordHash: await bcrypt.hash(password, 12),
    role: "customer",
    isActive: true,
    addresses: [address],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await db.collection("orders").insertMany(
    ["shipped", "processing", "delivered", "pending", "cancelled"].map(
      (status, index) => ({
        user: index === 4 ? other : user,
        orderNumber: `LX-${100001 + index}`,
        items: [
          {
            product: new mongoose.Types.ObjectId(),
            title: "یخچال ساید بای ساید",
            slug: "side-by-side",
            image: "/images/preview/categories/side-by-side.png",
            price: 89500000,
            quantity: 1,
          },
        ],
        subtotal: 89500000,
        shippingFee: 0,
        total: 89500000,
        shippingAddress: address,
        status,
        payment: { status: status === "pending" ? "unpaid" : "paid" },
        statusHistory: [],
        createdAt: new Date(Date.now() - index * 86400000),
        updatedAt: new Date(),
      }),
    ),
  );
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "production",
        MONGODB_URI: mongo.uri.replace("/?", "/customer_dashboard_browser?"),
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
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of ["/test/login", "/test/signup", "/test/dashbord"]) {
    assert.equal(
      (await page.request.get(`${base}${route}`)).status(),
      404,
      "Retired preview pages must return 404",
    );
  }
  await page.goto(`${base}/account/addresses`);
  assert.equal(new URL(page.url()).pathname, "/login");
  await page.locator('[name="email"]').fill("dashboard@example.com");
  await page.locator('[name="password"]').fill(password);
  await page.getByRole("button", { name: "ورود", exact: true }).click();
  await page.waitForURL(`${base}/account/addresses`);
  for (const view of ["dashboard", "orders", "addresses", "profile"]) {
    await page.goto(`${base}/account${view === "dashboard" ? "" : `/${view}`}`);
    await page.locator("main h1").waitFor();
    assert.equal(await page.locator("[data-frostic-header]").count(), 1);
    assert.equal(await page.locator("[data-arctic-footer]").count(), 1);
    for (const width of [360, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${view} overflows at ${width}`,
      );
      if (view === "profile") {
        const panels = page.locator(
          'main section:has(form input[value="profile"]), main section:has(form input[value="password"])',
        );
        assert.equal(await panels.count(), 2);
        for (const panel of await panels.all()) {
          assert.equal(
            Math.round((await panel.boundingBox()).height),
            560,
            "Profile panels must keep their specified height",
          );
        }
      }
      await page.screenshot({
        path: join(artifacts, `${view}-${width}.png`),
        fullPage: true,
      });
    }
  }
  await page.goto(`${base}/account/orders`);
  await page.setViewportSize({ width: 1440, height: 640 });
  const sidebar = page.locator("#dashboard-navigation");
  const shortSidebar = await sidebar.boundingBox();
  const headingBefore = await page.locator("main h1").boundingBox();
  await page.evaluate(() => window.scrollTo(0, 120));
  const firstScroll = await sidebar.boundingBox();
  await page.evaluate(() => window.scrollTo(0, 170));
  const secondScroll = await sidebar.boundingBox();
  const headingAfter = await page.locator("main h1").boundingBox();
  assert.ok(
    Math.abs(firstScroll.y - secondScroll.y) <= 1,
    "Desktop sidebar must remain stationary while scrolling",
  );
  assert.ok(headingAfter.y < headingBefore.y, "Account content must scroll");
  assert.ok(secondScroll.y >= 80, "Sidebar must stay below the sticky header");
  assert.ok(
    secondScroll.y + secondScroll.height <= 640,
    "Sidebar must fit the viewport",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  const tallSidebar = await sidebar.boundingBox();
  const logout = await sidebar.locator('button[type="submit"]').boundingBox();
  const logoutGap =
    tallSidebar.y + tallSidebar.height - logout.y - logout.height;
  assert.ok(
    logoutGap >= 16 && logoutGap <= 24,
    "Logout must sit at the bottom of the sidebar with comfortable spacing",
  );
  assert.ok(
    Math.abs(tallSidebar.height - shortSidebar.height - 260) <= 1,
    "Sidebar height must follow viewport height",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.goto(`${base}/account/orders?status=shipped`);
  assert.equal(await page.locator("main article").count(), 1);
  assert.ok((await page.locator("main").innerText()).includes("LX-۱۰۰۰۰۱"));
  const ownOrder = await db.collection("orders").findOne({ user });
  await page.goto(`${base}/account/orders/${ownOrder._id}`);
  await page.getByRole("heading", { name: "نشانی ارسال" }).waitFor();
  assert.equal(
    await page
      .locator('#dashboard-navigation a[aria-current="page"]')
      .getAttribute("href"),
    "/account/orders",
  );
  const foreignOrder = await db.collection("orders").findOne({ user: other });
  assert.equal(
    (
      await page.request.get(`${base}/account/orders/${foreignOrder._id}`)
    ).status(),
    404,
  );
  await page.goto(`${base}/account/orders?page=2`);
  assert.equal(await page.locator("main article").count(), 1);
  await page.goto(`${base}/account/profile`);
  const passwordForm = page.locator('form:has(input[value="password"])');
  await passwordForm.locator('[name="password"]').fill("Snowflake123!");
  await passwordForm.locator('[name="confirmPassword"]').fill("Snowflake123!");
  assert.equal(await passwordForm.locator(".lucide-snowflake").count(), 4);
  assert.equal(await passwordForm.locator("li.text-success").count(), 0);
  const profile = page.locator('form:has(input[value="profile"])');
  await profile.locator('[name="name"]').fill("سپهر موسوی");
  await profile
    .getByRole("button", { name: "ذخیره اطلاعات", exact: true })
    .click();
  await profile.getByRole("status").waitFor();
  await page.reload();
  assert.equal(await page.locator('[name="name"]').inputValue(), "سپهر موسوی");
  assert.equal(
    (await db.collection("users").findOne({ _id: user })).name,
    "سپهر موسوی",
  );
  await page.goto(`${base}/account/addresses`);
  const add = page.locator('form:has(input[value="add"])');
  await add.locator('[name="title"]').fill("محل کار");
  await add.locator('[name="recipientName"]').fill("سپهر موسوی");
  await add.locator('[name="mobile"]').fill("09123456789");
  await add.locator('[name="postalCode"]').fill("1234567890");
  await add.locator('[name="province"]').selectOption("تهران");
  await add.locator('[name="city"]').selectOption("تهران");
  await add
    .locator('[name="addressLine"]')
    .fill("خیابان مطهری، پلاک ۱۸، طبقه دوم");
  await add.getByRole("button", { name: "ذخیره آدرس", exact: true }).click();
  await add.getByRole("status").waitFor();
  assert.equal(
    (await db.collection("users").findOne({ _id: user })).addresses.length,
    2,
  );
  await page.reload();
  assert.equal(await page.locator("main article").count(), 2);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole("button", { name: "منوی حساب", exact: true }).click();
  await page
    .locator("#dashboard-navigation a")
    .filter({ hasText: "داشبورد" })
    .click();
  await page.waitForURL(`${base}/account`);
  assert.equal(await page.locator("#dashboard-navigation").isVisible(), false);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      ok: true,
      artifacts,
      checks: [
        "authentication",
        "four views",
        "four viewport widths",
        "order ownership and filtering",
        "profile persistence",
        "address persistence",
        "mobile navigation",
        "shared header and footer",
        "retired preview pages return 404",
        "order details and ownership",
        "order pagination",
        "sticky desktop sidebar and viewport height",
        "fixed equal profile panel heights",
        "blue snowflake password cues",
        "bottom aligned logout",
      ],
    }),
  );
} catch (error) {
  console.error(error);
  console.error(output.slice(-3000));
  process.exitCode = 1;
} finally {
  await browser?.close();
  server?.kill();
  await mongoose.disconnect();
  await mongo.stop();
}
