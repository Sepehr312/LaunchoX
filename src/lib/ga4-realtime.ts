import "server-only";
import { BetaAnalyticsDataClient, type protos } from "@google-analytics/data";
import { AnalyticsResponseError } from "@/lib/analytics-error";
import type { RealtimeAnalyticsReport } from "@/types/analytics";

type Report = protos.google.analytics.data.v1beta.IRunRealtimeReportResponse;
const metricNames = ["activeUsers", "screenPageViews"] as const;

function parseRows(
  report: Report,
  dimensionName?: "minutesAgo" | "city" | "deviceCategory",
) {
  if (
    metricNames.some(
      (name) => !report.metricHeaders?.some((header) => header.name === name),
    ) ||
    (dimensionName &&
      !report.dimensionHeaders?.some(
        (header) => header.name === dimensionName,
      )) ||
    (!report.rows?.length && report.rowCount) ||
    (!dimensionName && (report.rows?.length ?? 0) > 1)
  )
    throw new AnalyticsResponseError("Incomplete realtime report");
  return (report.rows ?? []).map((row) => {
    const values = metricNames.map((name) => {
      const index = report.metricHeaders!.findIndex(
        (header) => header.name === name,
      );
      const raw = row.metricValues?.[index]?.value;
      if (
        typeof raw !== "string" ||
        !/^\d+$/.test(raw) ||
        !Number.isSafeInteger(Number(raw))
      )
        throw new AnalyticsResponseError("Invalid realtime metric");
      return Number(raw);
    });
    let minutesAgo = 0;
    if (dimensionName === "minutesAgo") {
      const index = report.dimensionHeaders!.findIndex(
        (header) => header.name === "minutesAgo",
      );
      const raw = row.dimensionValues?.[index]?.value;
      if (typeof raw !== "string" || !/^\d{1,2}$/.test(raw) || Number(raw) > 29)
        throw new AnalyticsResponseError("Invalid realtime minute");
      minutesAgo = Number(raw);
    }
    let dimensionValue = "";
    if (dimensionName === "city" || dimensionName === "deviceCategory") {
      const index = report.dimensionHeaders!.findIndex(
        (header) => header.name === dimensionName,
      );
      const raw = row.dimensionValues?.[index]?.value;
      if (typeof raw !== "string")
        throw new AnalyticsResponseError("Invalid realtime dimension");
      dimensionValue = raw;
    }
    return {
      minutesAgo,
      dimensionValue,
      activeUsers: values[0],
      screenPageViews: values[1],
    };
  });
}

export async function fetchRealtimeAnalyticsReport(credentials: {
  GA4_PROPERTY_ID: string;
  GOOGLE_CLIENT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
}): Promise<RealtimeAnalyticsReport> {
  const client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: credentials.GOOGLE_CLIENT_EMAIL,
      private_key: credentials.GOOGLE_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  const base = {
    property: `properties/${credentials.GA4_PROPERTY_ID}`,
    minuteRanges: [{ startMinutesAgo: 29, endMinutesAgo: 0 }],
    metrics: metricNames.map((name) => ({ name })),
  };
  try {
    const settled = await Promise.allSettled([
      client.runRealtimeReport(base, { timeout: 12000, retry: null }),
      client.runRealtimeReport(
        { ...base, dimensions: [{ name: "minutesAgo" }], limit: 30 },
        { timeout: 12000, retry: null },
      ),
      client.runRealtimeReport(
        {
          ...base,
          dimensions: [{ name: "city" }],
          limit: 10,
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        },
        { timeout: 12000, retry: null },
      ),
      client.runRealtimeReport(
        {
          ...base,
          dimensions: [{ name: "deviceCategory" }],
          limit: 10,
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        },
        { timeout: 12000, retry: null },
      ),
    ]);
    const reports = settled.map((result) => {
      if (result.status === "rejected") throw result.reason;
      return result.value[0];
    });
    const totals = parseRows(reports[0])[0];
    const rows = parseRows(reports[1], "minutesAgo");
    const cities = parseRows(reports[2], "city");
    const devices = parseRows(reports[3], "deviceCategory");
    const byMinute = new Map(rows.map((row) => [row.minutesAgo, row]));
    if (byMinute.size !== rows.length)
      throw new AnalyticsResponseError("Duplicate realtime minute");
    return {
      days: "realtime",
      fetchedAt: new Date().toISOString(),
      // Distinct users come from the aggregate, never the sum of per-minute users.
      totals: {
        activeUsers: totals?.activeUsers ?? 0,
        screenPageViews: totals?.screenPageViews ?? 0,
      },
      cities: cities.map(({ dimensionValue, activeUsers }) => ({
        city: dimensionValue,
        activeUsers,
      })),
      devices: devices.map(({ dimensionValue, activeUsers }) => ({
        category: dimensionValue,
        activeUsers,
      })),
      minutes: Array.from({ length: 30 }, (_, index) => {
        const minutesAgo = 29 - index;
        return (
          byMinute.get(minutesAgo) ?? {
            minutesAgo,
            activeUsers: 0,
            screenPageViews: 0,
          }
        );
      }),
    };
  } finally {
    await client.close().catch(() => undefined);
  }
}
