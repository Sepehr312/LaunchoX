import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  analyticsRanges,
  propertyDate,
  shiftDate,
} from "@/lib/analytics-range";
import { formatReportDate, percentageChange } from "@/lib/format";
import {
  analyticsCredentialsSchema,
  analyticsQuerySchema,
} from "@/validations/analytics";

it("uses the property calendar date rather than server or Tehran date", () => {
  const now = new Date("2026-01-01T01:00:00Z");
  expect(propertyDate(now, "America/Los_Angeles")).toBe("2025-12-31");
  expect(analyticsRanges(now, "America/Los_Angeles", 7)).toEqual({
    range: { startDate: "2025-12-24", endDate: "2025-12-30" },
    previousRange: { startDate: "2025-12-17", endDate: "2025-12-23" },
  });
  expect(analyticsRanges(now, "Asia/Tehran", 7).range.endDate).toBe(
    "2025-12-31",
  );
});

it.each([7, 30] as const)(
  "builds adjacent equal %s day ranges over DST and year boundaries",
  (days) => {
    for (const now of [
      "2026-03-09T03:00:00Z",
      "2026-11-02T03:00:00Z",
      "2026-01-02T03:00:00Z",
    ]) {
      const { range, previousRange } = analyticsRanges(
        new Date(now),
        "America/New_York",
        days,
      );
      expect(shiftDate(range.startDate, days - 1)).toBe(range.endDate);
      expect(shiftDate(previousRange.startDate, days - 1)).toBe(
        previousRange.endDate,
      );
      expect(shiftDate(previousRange.endDate, 1)).toBe(range.startDate);
    }
    expect(shiftDate("2024-03-01", -1)).toBe("2024-02-29");
  },
);

it("does not invent a percentage for a zero baseline", () => {
  expect(percentageChange(50, 0)).toBeNull();
  expect(percentageChange(0, 0)).toBeNull();
  expect(percentageChange(0, 50)).toBe(-100);
  expect(percentageChange(75, 50)).toBe(50);
  expect(formatReportDate("2026-11-10")).toContain("آبان");
});

it("only accepts a scalar 7 or 30 day range", () => {
  expect(analyticsQuerySchema.parse({})).toEqual({ days: "7" });
  for (const days of [7, 0, "0", "365", "-7", ["7", "30"], "7 OR 1=1"]) {
    expect(analyticsQuerySchema.safeParse({ days }).success).toBe(false);
  }
  expect(
    analyticsQuerySchema.safeParse({ days: "7", property: "other" }).success,
  ).toBe(false);
});

it("normalizes escaped and real key newlines without requiring local credentials", () => {
  const config = {
    GA4_PROPERTY_ID: "563535207",
    GOOGLE_CLIENT_EMAIL: "test@example.iam.gserviceaccount.com",
  };
  const key =
    "-----BEGIN PRIVATE KEY-----\nTEST-ONLY\n-----END PRIVATE KEY-----";
  expect(
    analyticsCredentialsSchema.parse({
      ...config,
      GOOGLE_PRIVATE_KEY: key.replaceAll("\n", "\\n"),
    }).GOOGLE_PRIVATE_KEY,
  ).toBe(key);
  expect(
    analyticsCredentialsSchema.parse({ ...config, GOOGLE_PRIVATE_KEY: key })
      .GOOGLE_PRIVATE_KEY,
  ).toBe(key);
  expect(
    analyticsCredentialsSchema.safeParse({ ...config, GOOGLE_PRIVATE_KEY: "" })
      .success,
  ).toBe(false);
  expect(
    analyticsCredentialsSchema.safeParse({
      ...config,
      GA4_PROPERTY_ID: "../other",
      GOOGLE_PRIVATE_KEY: key,
    }).success,
  ).toBe(false);
});
