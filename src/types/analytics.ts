export type AnalyticsDays = 7 | 30;
export type AnalyticsMetric =
  "activeUsers" | "newUsers" | "screenPageViews" | "sessions";
export type AnalyticsTotals = Record<AnalyticsMetric, number>;
export interface AnalyticsRange {
  startDate: string;
  endDate: string;
}
export interface AnalyticsReport {
  days: AnalyticsDays;
  timeZone: string;
  range: AnalyticsRange;
  previousRange: AnalyticsRange;
  fetchedAt: string;
  totals: AnalyticsTotals;
  previous: AnalyticsTotals;
  daily: { date: string; activeUsers: number; screenPageViews: number }[];
  sources: { source: string; sessions: number }[];
  pages: { path: string; views: number }[];
  limitedData: boolean;
}
export type AnalyticsFailureCode =
  | "configuration"
  | "forbidden"
  | "connection"
  | "quota"
  | "busy"
  | "storage"
  | "invalid";
export type AnalyticsResult =
  | { ok: true; report: AnalyticsReport }
  | { ok: false; code: AnalyticsFailureCode; retryAfterSeconds?: number };
