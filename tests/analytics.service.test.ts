import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { startTestMongo } from "./mongo-server";
import type { AnalyticsReport } from "@/types/analytics";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  fetch: vi.fn(),
  realtime: vi.fn(),
  env: vi.fn(),
  connect: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.guard }));
vi.mock("@/lib/env", () => ({ getEnv: mocks.env }));
vi.mock("@/lib/db", () => ({ connectDB: mocks.connect }));
vi.mock("@/lib/ga4-realtime", () => ({
  fetchRealtimeAnalyticsReport: mocks.realtime,
}));
vi.mock("@/lib/ga4", () => ({
  fetchAnalyticsReport: mocks.fetch,
  analyticsErrorCode: () => "forbidden",
}));
import { AnalyticsCache } from "@/models/analytics-cache";
import { getAnalyticsReport } from "@/services/analytics.service";

let server: Awaited<ReturnType<typeof startTestMongo>>;
const config = {
  GA4_PROPERTY_ID: "563535207",
  GOOGLE_CLIENT_EMAIL: "test@example.com",
  GOOGLE_PRIVATE_KEY:
    "-----BEGIN PRIVATE KEY-----\nTEST-ONLY\n-----END PRIVATE KEY-----",
};
const report: AnalyticsReport = {
  days: 7,
  timeZone: "Asia/Tehran",
  range: { startDate: "2026-11-01", endDate: "2026-11-07" },
  previousRange: { startDate: "2026-10-25", endDate: "2026-10-31" },
  fetchedAt: "2026-11-08T01:00:00Z",
  totals: {
    activeUsers: 123,
    newUsers: 50,
    screenPageViews: 500,
    sessions: 200,
  },
  previous: {
    activeUsers: 100,
    newUsers: 0,
    screenPageViews: 400,
    sessions: 100,
  },
  daily: [],
  pages: [],
  sources: [],
  cities: [],
  devices: [],
  limitedData: false,
};
beforeAll(async () => {
  server = await startTestMongo();
  await mongoose.connect(server.uri, {
    dbName: "launchox_analytics_test",
    bufferCommands: false,
  });
  await AnalyticsCache.init();
}, 180000);
beforeEach(async () => {
  vi.resetAllMocks();
  await AnalyticsCache.deleteMany({});
  mocks.connect.mockResolvedValue(mongoose);
  mocks.env.mockReturnValue(config);
  mocks.fetch.mockResolvedValue(report);
});
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});

it("guards the service before credentials, cache, or network access", async () => {
  mocks.guard.mockRejectedValue(new Error("denied"));
  await expect(getAnalyticsReport({ days: "7" })).rejects.toThrow("denied");
  expect(mocks.env).not.toHaveBeenCalled();
  expect(mocks.connect).not.toHaveBeenCalled();
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("guards realtime access before contacting Google", async () => {
  mocks.guard.mockRejectedValue(new Error("denied"));
  await expect(getAnalyticsReport({ days: "realtime" })).rejects.toThrow(
    "denied",
  );
  expect(mocks.realtime).not.toHaveBeenCalled();
  expect(mocks.connect).not.toHaveBeenCalled();
});

it("isolates realtime reports with a 60 second shared cache and refresh limit", async () => {
  const live = {
    days: "realtime" as const,
    fetchedAt: new Date().toISOString(),
    totals: { activeUsers: 3, screenPageViews: 12 },
    cities: [],
    devices: [],
    minutes: [],
  };
  mocks.realtime.mockResolvedValue(live);
  expect(await getAnalyticsReport({ days: "realtime" })).toEqual({
    ok: true,
    report: live,
  });
  expect(await getAnalyticsReport({ days: "realtime" })).toEqual({
    ok: true,
    report: live,
  });
  expect(mocks.realtime).toHaveBeenCalledOnce();
  expect(mocks.fetch).not.toHaveBeenCalled();
  const cache = await AnalyticsCache.findById(
    "ga4:v3:563535207:realtime",
  ).lean();
  expect(cache!.expiresAt!.getTime() - Date.now()).toBeGreaterThan(50000);
  expect(cache!.expiresAt!.getTime() - Date.now()).toBeLessThanOrEqual(60000);
  expect(await getAnalyticsReport({ days: "realtime" }, true)).toMatchObject({
    ok: false,
    code: "busy",
  });
});

it("does not turn realtime network errors into zero activity", async () => {
  mocks.realtime.mockRejectedValue({ code: "ETIMEDOUT", message: "PRIVATE" });
  const result = await getAnalyticsReport({ days: "realtime" });
  expect(result).toMatchObject({
    ok: false,
    code: "connection",
    diagnostic: "timeout",
  });
  expect(JSON.stringify(result)).not.toContain("PRIVATE");
});

it("handles missing credentials and invalid ranges without database or network calls", async () => {
  expect(await getAnalyticsReport({ days: "365" })).toEqual({
    ok: false,
    code: "invalid",
  });
  mocks.env.mockReturnValue({});
  expect(await getAnalyticsReport({ days: "7" })).toEqual({
    ok: false,
    code: "configuration",
  });
  expect(mocks.connect).not.toHaveBeenCalled();
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("shares reports for 15 minutes and blocks manual refresh across both ranges", async () => {
  expect(await getAnalyticsReport({ days: "7" })).toEqual({ ok: true, report });
  expect(await getAnalyticsReport({ days: "7" })).toEqual({ ok: true, report });
  expect(mocks.fetch).toHaveBeenCalledOnce();
  const cached = await AnalyticsCache.findById("ga4:v3:563535207:7").lean();
  expect(cached!.expiresAt!.getTime() - Date.now()).toBeGreaterThan(14 * 60000);
  expect(await getAnalyticsReport({ days: "7" }, true)).toMatchObject({
    ok: false,
    code: "busy",
  });
  expect(await getAnalyticsReport({ days: "30" }, true)).toMatchObject({
    ok: false,
    code: "busy",
  });
  expect(mocks.fetch).toHaveBeenCalledOnce();
  await AnalyticsCache.updateOne(
    { _id: "ga4:lock:563535207" },
    { $set: { nextAttemptAt: new Date(0) } },
  );
  await getAnalyticsReport({ days: "7" }, true);
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
});

it("fetches expired cache entries and isolates property IDs", async () => {
  await getAnalyticsReport({ days: "7" });
  await AnalyticsCache.updateMany(
    {},
    { $set: { expiresAt: new Date(0), nextAttemptAt: new Date(0) } },
  );
  await getAnalyticsReport({ days: "7" });
  mocks.env.mockReturnValue({ ...config, GA4_PROPERTY_ID: "123456789" });
  await getAnalyticsReport({ days: "7" });
  expect(mocks.fetch).toHaveBeenCalledTimes(3);
});

it("allows switching to an uncached range without the manual cooldown", async () => {
  await getAnalyticsReport({ days: "7" });
  expect((await getAnalyticsReport({ days: "30" })).ok).toBe(true);
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
});

it("only one of simultaneous cold requests reaches Google", async () => {
  const results = await Promise.all(
    Array.from({ length: 8 }, () => getAnalyticsReport({ days: "7" })),
  );
  expect(mocks.fetch).toHaveBeenCalledOnce();
  expect(results.some((result) => result.ok)).toBe(true);
  expect(
    results
      .filter((result) => !result.ok)
      .every((result) => !result.ok && result.code === "busy"),
  ).toBe(true);
});

it("returns a sanitized failure without stale statistics, and throttles failures", async () => {
  await getAnalyticsReport({ days: "7" });
  await AnalyticsCache.updateOne(
    { _id: "ga4:lock:563535207" },
    { $set: { nextAttemptAt: new Date(0) } },
  );
  mocks.fetch.mockRejectedValue({
    code: 7,
    message: "TEST-SENSITIVE-DETAIL",
    private_key: "TEST-SENSITIVE-KEY",
  });
  expect(await getAnalyticsReport({ days: "7" }, true)).toEqual({
    ok: false,
    code: "forbidden",
  });
  expect(await getAnalyticsReport({ days: "7" })).toEqual({
    ok: false,
    code: "forbidden",
  });
  const cached = await AnalyticsCache.findById("ga4:v3:563535207:7").lean();
  expect(JSON.stringify(cached)).not.toContain("TEST-SENSITIVE");
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
});

it("fails closed when shared storage is unavailable", async () => {
  mocks.connect.mockRejectedValue(new Error("TEST-SENSITIVE-DATABASE-URI"));
  expect(await getAnalyticsReport({ days: "7" })).toEqual({
    ok: false,
    code: "storage",
  });
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("persists and returns only allowlisted diagnostics for wrapped Google failures", async () => {
  mocks.fetch.mockRejectedValue({
    code: 2,
    details: "Getting metadata failed: invalid_grant TEST-SENSITIVE-KEY",
    response: {
      data: { error: "invalid_grant", private_key: "TEST-SENSITIVE-KEY" },
    },
  });
  const expected = {
    ok: false,
    code: "forbidden",
    diagnostic: "token-rejected",
  };
  expect(await getAnalyticsReport({ days: "7" })).toEqual(expected);
  expect(await getAnalyticsReport({ days: "7" })).toEqual(expected);
  const stored = await AnalyticsCache.findById("ga4:v3:563535207:7").lean();
  expect(stored?.result).toEqual(expected);
  expect(JSON.stringify(stored)).not.toContain("TEST-SENSITIVE");
  expect(mocks.fetch).toHaveBeenCalledOnce();
});
