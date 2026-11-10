import type { AnalyticsDays, AnalyticsRange } from "@/types/analytics";

export function propertyDate(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) =>
    parts.find((item) => item.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function analyticsRanges(
  now: Date,
  timeZone: string,
  days: AnalyticsDays,
): {
  range: AnalyticsRange;
  previousRange: AnalyticsRange;
} {
  const today = propertyDate(now, timeZone);
  return {
    range: {
      startDate: shiftDate(today, -days),
      endDate: shiftDate(today, -1),
    },
    previousRange: {
      startDate: shiftDate(today, -2 * days),
      endDate: shiftDate(today, -days - 1),
    },
  };
}
