import "server-only";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { fetchAnalyticsReport } from "@/lib/ga4";
import { analyticsFailure } from "@/lib/analytics-error";
import { fetchRealtimeAnalyticsReport } from "@/lib/ga4-realtime";
import { AnalyticsCache } from "@/models/analytics-cache";
import {
  analyticsCredentialsSchema,
  analyticsQuerySchema,
} from "@/validations/analytics";
import type { AnalyticsResult } from "@/types/analytics";

export async function getAnalyticsReport(
  input: unknown,
  refresh = false,
): Promise<AnalyticsResult> {
  await requireAdmin();
  const query = analyticsQuerySchema.safeParse(input);
  if (!query.success) return { ok: false, code: "invalid" };
  const config = analyticsCredentialsSchema.safeParse(getEnv());
  if (!config.success) return { ok: false, code: "configuration" };
  const days =
    query.data.days === "realtime"
      ? "realtime"
      : query.data.days === "7"
        ? 7
        : 30;
  const key = `ga4:v3:${config.data.GA4_PROPERTY_ID}:${days}`;
  const lockKey = `ga4:lock:${config.data.GA4_PROPERTY_ID}`;
  const owner = randomUUID();
  const now = Date.now();
  try {
    await connectDB();
    if (!refresh) {
      const cached = await AnalyticsCache.findById(key).lean();
      if (
        cached?.result &&
        cached.expiresAt &&
        cached.expiresAt.getTime() > now
      )
        return cached.result;
    }
    try {
      // A unique ID makes acquisition atomic across processes, including the first request.
      await AnalyticsCache.findOneAndUpdate(
        {
          _id: lockKey,
          $and: [
            {
              $or: [
                { leaseUntil: { $lte: new Date(now) } },
                { leaseUntil: { $exists: false } },
              ],
            },
            ...(refresh
              ? [
                  {
                    $or: [
                      { nextAttemptAt: { $lte: new Date(now) } },
                      { nextAttemptAt: { $exists: false } },
                    ],
                  },
                ]
              : []),
          ],
        },
        {
          $set: {
            owner,
            leaseUntil: new Date(now + 90000),
            nextAttemptAt: new Date(now + 60000),
          },
        },
        { upsert: true, setDefaultsOnInsert: false },
      );
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ) {
        const lock = await AnalyticsCache.findById(lockKey).lean();
        return {
          ok: false,
          code: "busy",
          retryAfterSeconds: Math.max(
            1,
            Math.ceil(
              (Math.max(
                lock?.leaseUntil?.getTime() ?? now,
                lock?.nextAttemptAt?.getTime() ?? now,
              ) -
                now) /
                1000,
            ),
          ),
        };
      }
      throw error;
    }
    try {
      // Another request may have filled the cache between our first read and lease acquisition.
      if (!refresh) {
        const cached = await AnalyticsCache.findById(key).lean();
        if (
          cached?.result &&
          cached.expiresAt &&
          cached.expiresAt.getTime() > Date.now()
        )
          return cached.result;
      }
      let result: AnalyticsResult;
      try {
        result = {
          ok: true,
          report:
            days === "realtime"
              ? await fetchRealtimeAnalyticsReport(config.data)
              : await fetchAnalyticsReport(config.data, days),
        };
      } catch (error: unknown) {
        // Google errors may contain credentials or request details; only a fixed code crosses the boundary.
        result = analyticsFailure(error);
      }
      await AnalyticsCache.updateOne(
        { _id: key },
        {
          $set: {
            result,
            expiresAt: new Date(
              Date.now() +
                (result.ok && days !== "realtime" ? 15 * 60000 : 60000),
            ),
          },
        },
        { upsert: true },
      );
      return result;
    } finally {
      await AnalyticsCache.updateOne(
        { _id: lockKey, owner },
        { $set: { leaseUntil: new Date(0) } },
      );
    }
  } catch {
    return { ok: false, code: "storage" };
  }
}
