import { spawn, execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import { encode } from "next-auth/jwt";
import { startTestMongo } from "./mongo-server.ts";

// All report fixtures and credentials here belong only to the disposable test server.
const root = fileURLToPath(new URL("../", import.meta.url));
const base = "http://localhost:3053";
const secret = randomBytes(48).toString("hex");
const databaseName = `launchox_analytics_browser_${randomUUID().replaceAll("-", "")}`;
let mongo;
let server;
try {
  mongo = await startTestMongo();
  const uri = new URL(mongo.uri);
  uri.pathname = `/${databaseName}`;
  await mongoose.connect(uri.href);
  const db = mongoose.connection.db;
  const users = await db.collection("users").insertMany(
    ["admin", "customer"].map((role) => ({
      name: "کاربر آزمایشی",
      role,
      isActive: true,
      sessionVersion: 0,
      addresses: [],
    })),
  );
  const tokenFor = (index) =>
    encode({
      secret,
      salt: "authjs.session-token",
      maxAge: 600,
      token: {
        id: String(users.insertedIds[index]),
        role: "admin",
        sessionVersion: 0,
      },
    });
  const adminToken = await tokenFor(0);
  // Deliberately stale admin claim: the server must still deny a current customer.
  const customerToken = await tokenFor(1);
  for (const days of [7, 30]) {
    const start = new Date("2026-10-11T12:00:00Z");
    const daily = Array.from({ length: days }, (_, index) => ({
      date: new Date(start.getTime() + index * 86400000)
        .toISOString()
        .slice(0, 10),
      activeUsers: 100 + index * 3,
      screenPageViews: 400 + (index % 4) * 50,
    }));
    const report = {
      days,
      timeZone: "Asia/Tehran",
      range: { startDate: daily[0].date, endDate: daily.at(-1).date },
      previousRange: { startDate: "2026-09-11", endDate: "2026-10-10" },
      fetchedAt: new Date().toISOString(),
      totals: {
        activeUsers: 1284,
        newUsers: 968,
        screenPageViews: 5420,
        sessions: 1760,
      },
      previous: {
        activeUsers: 1140,
        newUsers: 0,
        screenPageViews: 4578,
        sessions: 1816,
      },
      daily,
      cities: [{ city: "Tabriz", activeUsers: 9 }],
      devices: [{ category: "mobile", activeUsers: 5 }],
      sources: [
        { source: "google / organic", sessions: 840 },
        { source: "(direct) / (none)", sessions: 540 },
      ],
      pages: [
        { path: "/", views: 1840 },
        { path: "/products/[slug]", views: 1520 },
      ],
      limitedData: false,
    };
    await db.collection("analyticscaches").insertOne({
      _id: `ga4:v3:563535207:${days}`,
      result: { ok: true, report },
      expiresAt: new Date(Date.now() + 900000),
    });
  }
  await db.collection("analyticscaches").insertOne({
    _id: "ga4:v3:563535207:realtime",
    result: {
      ok: true,
      report: {
        days: "realtime",
        fetchedAt: new Date().toISOString(),
        totals: { activeUsers: 1, screenPageViews: 3 },
        cities: [{ city: "Tabriz", activeUsers: 3 }],
        devices: [{ category: "tablet", activeUsers: 1 }],
        minutes: Array.from({ length: 30 }, (_, index) => ({
          minutesAgo: 29 - index,
          activeUsers: index === 7 ? 1 : 0,
          screenPageViews: index === 7 ? 3 : 0,
        })),
      },
    },
    expiresAt: new Date(Date.now() + 600000),
  });
  // Keep manual refresh away from Google even with the deliberately unusable test key.
  await db.collection("analyticscaches").insertOne({
    _id: "ga4:lock:563535207",
    leaseUntil: new Date(0),
    nextAttemptAt: new Date(Date.now() + 600000),
  });
  for (const mode of ["configuration", "reports"]) {
    server = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "--port", "3053"],
      {
        cwd: root,
        windowsHide: true,
        stdio: "ignore",
        env: {
          ...process.env,
          NODE_ENV: "production",
          MONGODB_URI: uri.href,
          AUTH_SECRET: secret,
          AUTH_URL: base,
          NEXT_PUBLIC_SITE_URL: base,
          NEXT_PUBLIC_SITE_NAME: "لانچو ایکس",
          NEXT_PUBLIC_GA_MEASUREMENT_ID: "",
          PAYMENT_PROVIDER: "fake",
          SHIPPING_FLAT_FEE: "0",
          FREE_SHIPPING_THRESHOLD: "0",
          SMS_IR_ENABLED: "false",
          GA4_PROPERTY_ID: "563535207",
          GOOGLE_CLIENT_EMAIL:
            mode === "configuration" ? "" : "fixture@example.com",
          GOOGLE_PRIVATE_KEY:
            mode === "configuration"
              ? ""
              : "-----BEGIN PRIVATE KEY-----\nTEST-ONLY-UNUSABLE-KEY\n-----END PRIVATE KEY-----",
        },
      },
    );
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (server.exitCode !== null)
        throw new Error("Isolated analytics server exited");
      try {
        ready = (await fetch(`${base}/api/health/live`)).ok;
      } catch {
        /* Startup is asynchronous. */
      }
      if (ready) break;
      await delay(500);
    }
    if (!ready) throw new Error("Isolated analytics server was not ready");
    const { stdout } = await promisify(execFile)(
      process.env.LAUNCHO_PYTHON || "python",
      ["tests/analytics-browser.py"],
      {
        cwd: root,
        windowsHide: true,
        timeout: 180000,
        maxBuffer: 1024 * 1024,
        env: {
          ...process.env,
          LAUNCHO_ANALYTICS_URL: base,
          LAUNCHO_ANALYTICS_MODE: mode,
          LAUNCHO_ANALYTICS_ADMIN_TOKEN: adminToken,
          LAUNCHO_ANALYTICS_CUSTOMER_TOKEN: customerToken,
        },
      },
    );
    console.log(stdout.trim());
    const stopped = new Promise((resolve) => server.once("exit", resolve));
    server.kill();
    await stopped;
    server = undefined;
  }
} finally {
  server?.kill();
  if (mongoose.connection.db?.databaseName === databaseName)
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongo?.stop();
}
