export type AnalyticsDays = 7 | 30;
export interface RealtimeAnalyticsReport {
  days: "realtime";
  fetchedAt: string;
  totals: { activeUsers: number; screenPageViews: number };
  cities: { city: string; activeUsers: number }[];
  devices: { category: string; activeUsers: number }[];
  minutes: {
    minutesAgo: number;
    activeUsers: number;
    screenPageViews: number;
  }[];
}
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
  cities: { city: string; activeUsers: number }[];
  devices: { category: string; activeUsers: number }[];
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
export type AnalyticsDiagnostic =
  | "key-invalid"
  | "token-rejected"
  | "dns"
  | "timeout"
  | "transport"
  | "google-unavailable"
  | "api-disabled"
  | "request-rejected"
  | "response-invalid"
  | "time-zone-missing"
  | "unknown";
export type AnalyticsFailure = {
  ok: false;
  code: AnalyticsFailureCode;
  retryAfterSeconds?: number;
  diagnostic?: AnalyticsDiagnostic;
};
export type AnalyticsResult =
  | { ok: true; report: AnalyticsReport | RealtimeAnalyticsReport }
  | AnalyticsFailure;
