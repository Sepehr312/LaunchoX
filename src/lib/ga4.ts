import "server-only";
import { BetaAnalyticsDataClient, type protos } from "@google-analytics/data";
import { analyticsRanges, shiftDate } from "@/lib/analytics-range";
import type {
  AnalyticsDays,
  AnalyticsMetric,
  AnalyticsReport,
  AnalyticsTotals,
  AnalyticsFailureCode,
} from "@/types/analytics";

type Report = protos.google.analytics.data.v1beta.IRunReportResponse;
type Row = protos.google.analytics.data.v1beta.IRow;
const metrics: AnalyticsMetric[] = [
  "activeUsers",
  "newUsers",
  "screenPageViews",
  "sessions",
];

export function analyticsErrorCode(error: unknown): AnalyticsFailureCode {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined;
  if (
    [7, 16, 401, 403, "PERMISSION_DENIED", "UNAUTHENTICATED"].includes(
      code as string | number,
    )
  )
    return "forbidden";
  if ([8, 429, "RESOURCE_EXHAUSTED"].includes(code as string | number))
    return "quota";
  return "connection";
}

function count(report: Report, row: Row, metric: string): number {
  const index =
    report.metricHeaders?.findIndex((header) => header.name === metric) ?? -1;
  const raw = index < 0 ? undefined : row.metricValues?.[index]?.value;
  if (typeof raw !== "string" || !/^\d+$/.test(raw))
    throw new Error("Invalid analytics metric");
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) throw new Error("Invalid analytics count");
  return value;
}

function dimension(report: Report, row: Row, name: string): string {
  const index =
    report.dimensionHeaders?.findIndex((header) => header.name === name) ?? -1;
  const value = index < 0 ? undefined : row.dimensionValues?.[index]?.value;
  if (typeof value !== "string") throw new Error("Invalid analytics dimension");
  return value;
}

export function reportTotals(report: Report): AnalyticsTotals {
  for (const metric of metrics) {
    if (!report.metricHeaders?.some((header) => header.name === metric))
      throw new Error("Missing analytics metric");
  }
  if ((report.rows?.length ?? 0) > 1)
    throw new Error("Unexpected aggregate rows");
  if (!report.rows?.length && report.rowCount)
    throw new Error("Incomplete analytics report");
  const value = (metric: string) =>
    report.rows?.[0] ? count(report, report.rows[0], metric) : 0;
  return {
    activeUsers: value("activeUsers"),
    newUsers: value("newUsers"),
    screenPageViews: value("screenPageViews"),
    sessions: value("sessions"),
  };
}

function assertTable(report: Report, name: string, metricNames: string[]) {
  if (
    !report.dimensionHeaders?.some((header) => header.name === name) ||
    metricNames.some(
      (metric) =>
        !report.metricHeaders?.some((header) => header.name === metric),
    ) ||
    (!report.rows?.length && report.rowCount)
  )
    throw new Error("Incomplete analytics table");
}

export async function fetchAnalyticsReport(
  credentials: {
    GA4_PROPERTY_ID: string;
    GOOGLE_CLIENT_EMAIL: string;
    GOOGLE_PRIVATE_KEY: string;
  },
  days: AnalyticsDays,
): Promise<AnalyticsReport> {
  const client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: credentials.GOOGLE_CLIENT_EMAIL,
      private_key: credentials.GOOGLE_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  const property = `properties/${credentials.GA4_PROPERTY_ID}`;
  const run = async (
    request: protos.google.analytics.data.v1beta.IRunReportRequest,
  ) => {
    const [response] = await client.runReport(
      { ...request, property },
      { timeout: 12000, retry: null },
    );
    return response;
  };
  try {
    // Data API metadata supplies the property's time zone without requiring the Admin API.
    const probe = await run({
      dateRanges: [{ startDate: "yesterday", endDate: "yesterday" }],
      metrics: [{ name: "activeUsers" }],
      limit: 1,
    });
    const timeZone = probe.metadata?.timeZone;
    if (!timeZone) throw new Error("Missing property time zone");
    const { range, previousRange } = analyticsRanges(
      new Date(),
      timeZone,
      days,
    );
    const base = { dateRanges: [range] };
    const settled = await Promise.allSettled([
      run({ ...base, metrics: metrics.map((name) => ({ name })) }),
      run({
        dateRanges: [previousRange],
        metrics: metrics.map((name) => ({ name })),
      }),
      run({
        ...base,
        dimensions: [{ name: "date" }],
        metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
        limit: 30,
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
      run({
        ...base,
        dimensions: [{ name: "sessionSourceMedium" }],
        metrics: [{ name: "sessions" }],
        limit: 6,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      }),
      run({
        ...base,
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        limit: 10,
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      }),
    ]);
    const reports = settled.map((result) => {
      if (result.status === "rejected") throw result.reason;
      return result.value;
    });
    const [current, previous, daily, sources, pages] = reports;
    if (reports.some((report) => report.metadata?.timeZone !== timeZone))
      throw new Error("Property time zone changed");
    assertTable(daily, "date", ["activeUsers", "screenPageViews"]);
    assertTable(sources, "sessionSourceMedium", ["sessions"]);
    assertTable(pages, "pagePath", ["screenPageViews"]);
    const byDate = new Map(
      (daily.rows ?? []).map((row) => {
        const date = dimension(daily, row, "date");
        if (!/^\d{8}$/.test(date)) throw new Error("Invalid analytics date");
        const calendarDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
        if (
          calendarDate < range.startDate ||
          calendarDate > range.endDate ||
          shiftDate(calendarDate, 0) !== calendarDate
        )
          throw new Error("Invalid analytics calendar date");
        return [
          calendarDate,
          {
            activeUsers: count(daily, row, "activeUsers"),
            screenPageViews: count(daily, row, "screenPageViews"),
          },
        ];
      }),
    );
    if (byDate.size !== (daily.rows?.length ?? 0))
      throw new Error("Duplicate analytics dates");
    return {
      days,
      timeZone,
      range,
      previousRange,
      fetchedAt: new Date().toISOString(),
      totals: reportTotals(current),
      previous: reportTotals(previous),
      // Omitted dates in a successful GA report represent zero activity, never a failed request.
      daily: Array.from({ length: days }, (_, index) => {
        const date = shiftDate(range.startDate, index);
        return {
          date,
          ...(byDate.get(date) ?? { activeUsers: 0, screenPageViews: 0 }),
        };
      }),
      sources: (sources.rows ?? []).map((row) => ({
        source: dimension(sources, row, "sessionSourceMedium"),
        sessions: count(sources, row, "sessions"),
      })),
      pages: (pages.rows ?? []).map((row) => ({
        path: dimension(pages, row, "pagePath"),
        views: count(pages, row, "screenPageViews"),
      })),
      limitedData: reports.some((report) =>
        Boolean(
          report.metadata?.subjectToThresholding ||
          report.metadata?.dataLossFromOtherRow ||
          report.metadata?.samplingMetadatas?.length,
        ),
      ),
    };
  } finally {
    // A rejected parallel call must not close the client before the others settle.
    await client.close().catch(() => undefined);
  }
}
