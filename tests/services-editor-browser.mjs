import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { startTestMongo } from "./mongo-server.ts";
import { runServicesEditorScenario } from "./services-editor-browser-scenario.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.LAUNCHO_PLAYWRIGHT_PATH || "playwright",
);
const mongo = await startTestMongo(true),
  dbName = "content_" + randomUUID().replaceAll("-", "");
const base = "http://localhost:3037";
let server, browser;
let output = "";
try {
  await mongoose.connect(mongo.uri, { dbName });
  const db = mongoose.connection.db;
  const password = "Browser123!";
  const hash = await bcrypt.hash(password, 12);
  await db.collection("users").insertMany([
    {
      name: "مدیر",
      email: "admin@example.com",
      passwordHash: hash,
      role: "admin",
      isActive: true,
    },
    {
      name: "مشتری",
      email: "customer@example.com",
      passwordHash: hash,
      role: "customer",
      isActive: true,
    },
  ]);
  const category = new mongoose.Types.ObjectId();
  const product = new mongoose.Types.ObjectId();
  await db.collection("categories").insertOne({
    _id: category,
    name: "دسته آزمون",
    slug: "test-category",
    isActive: true,
  });
  await db.collection("products").insertOne({
    _id: product,
    title: "محصول آزمون",
    slug: "test-product",
    description: "توضیح محصول",
    price: 2000000,
    stock: 4,
    category,
    images: ["/images/arctic-showroom-light.webp"],
    attributes: [],
    isActive: true,
    isFeatured: true,
    soldCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", "3037"],
    {
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "production",
        MONGODB_URI: mongo.uri.replace("/?", "/" + dbName + "?"),
        AUTH_SECRET: randomUUID(),
        AUTH_URL: base,
        NEXT_PUBLIC_SITE_URL: base,
        NEXT_PUBLIC_SITE_NAME: "لانچ‌اوکس",
        PAYMENT_PROVIDER: "fake",
        SHIPPING_FLAT_FEE: "0",
        FREE_SHIPPING_THRESHOLD: "0",
        CONTACT_PHONE: "02187654321",
        CONTACT_EMAIL: "initial@example.com",
        CONTACT_ADDRESS: "تهران، نشانی اولیه",
      },
    },
  );
  server.stdout.on("data", (c) => (output += c));
  server.stderr.on("data", (c) => (output += c));
  for (let n = 0; n < 60; n++) {
    try {
      if ((await fetch(base + "/api/health")).ok) break;
    } catch {}
    await delay(1000);
  }
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const admin = await browser.newContext();
  const page = await admin.newPage();
  async function login(p, email, target) {
    await p.goto(base + "/login?callbackUrl=" + target);
    await p.locator("[name=email]").fill(email);
    await p.locator("[name=password]").fill(password);
    await p.getByRole("button", { name: "ورود", exact: true }).click();
    await p.waitForURL((url) => url.pathname === target);
  }
  await login(page, "admin@example.com", "/admin/content");
  await mkdir(new URL("../test-results/", import.meta.url), {
    recursive: true,
  });
  const original = await browser.newPage({
    viewport: { width: 1902, height: 908 },
  });
  await original.goto(base + "/services");
  assert.equal(await original.locator("[data-template]").count(), 6);
  await original.screenshot({
    path: fileURLToPath(
      new URL("../test-results/services-original-desktop.png", import.meta.url),
    ),
    fullPage: true,
  });
  await original.setViewportSize({ width: 360, height: 900 });
  assert.ok(
    await original.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await original.screenshot({
    path: fileURLToPath(
      new URL("../test-results/services-original-mobile.png", import.meta.url),
    ),
    fullPage: true,
  });
  await original.close();
  await runServicesEditorScenario({ page, browser, db, base });
} catch (error) {
  console.error(output);
  throw error;
} finally {
  await browser?.close();
  server?.kill();
  await mongoose.disconnect();
  await mongo.stop();
}
