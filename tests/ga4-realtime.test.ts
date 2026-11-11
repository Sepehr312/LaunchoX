import { beforeEach, expect, it, vi } from "vitest";
import type { protos } from "@google-analytics/data";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ run: vi.fn(), close: vi.fn() }));
vi.mock("@google-analytics/data", () => ({
  BetaAnalyticsDataClient: class {
    runRealtimeReport = mocks.run;
    close = mocks.close;
  },
}));
import { fetchRealtimeAnalyticsReport } from "@/lib/ga4-realtime";
type Request = protos.google.analytics.data.v1beta.IRunRealtimeReportRequest;
const credentials = {
  GA4_PROPERTY_ID: "563535207",
  GOOGLE_CLIENT_EMAIL: "test@example.com",
  GOOGLE_PRIVATE_KEY: "TEST-ONLY",
};
function response(request: Request) {
  const name = request.dimensions?.[0].name;
  const values =
    name === "minutesAgo"
      ? ["00", "01"]
      : name === "city"
        ? ["Tabriz"]
        : name === "deviceCategory"
          ? ["mobile", "tablet", "desktop"]
          : [""];
  return [
    {
      metricHeaders: [{ name: "activeUsers" }, { name: "screenPageViews" }],
      dimensionHeaders: name ? [{ name }] : [],
      rowCount: values.length,
      rows: values.map((value) => ({
        dimensionValues: name ? [{ value }] : [],
        metricValues: [
          { value: name === "minutesAgo" ? "2" : "3" },
          { value: "12" },
        ],
      })),
    },
  ];
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.close.mockResolvedValue(undefined);
  mocks.run.mockImplementation(async (request: Request) => response(request));
});

it("rejects an incomplete device report instead of displaying zero devices", async () => {
  mocks.run.mockImplementation(async (request: Request) => {
    if (request.dimensions?.[0].name === "deviceCategory")
      return [{ rowCount: 1 }];
    return response(request);
  });
  await expect(fetchRealtimeAnalyticsReport(credentials)).rejects.toThrow(
    "Incomplete realtime report",
  );
});
it("uses official realtime metrics, a bounded 30 minute window and an independent user aggregate", async () => {
  const report = await fetchRealtimeAnalyticsReport(credentials);
  expect(report.totals).toEqual({ activeUsers: 3, screenPageViews: 12 });
  expect(report.minutes).toHaveLength(30);
  expect(report.minutes[0]).toMatchObject({ minutesAgo: 29, activeUsers: 0 });
  expect(report.minutes.at(-1)).toMatchObject({
    minutesAgo: 0,
    activeUsers: 2,
  });
  expect(report.cities).toEqual([{ city: "Tabriz", activeUsers: 3 }]);
  expect(report.devices).toEqual([
    { category: "mobile", activeUsers: 3 },
    { category: "tablet", activeUsers: 3 },
    { category: "desktop", activeUsers: 3 },
  ]);
  expect(mocks.run).toHaveBeenCalledTimes(4);
  for (const [request] of mocks.run.mock.calls as [Request][]) {
    expect(request.property).toBe("properties/563535207");
    expect(request.minuteRanges).toEqual([
      { startMinutesAgo: 29, endMinutesAgo: 0 },
    ]);
    expect(request.metrics).toEqual([
      { name: "activeUsers" },
      { name: "screenPageViews" },
    ]);
  }
  expect(mocks.close).toHaveBeenCalledOnce();
});
it("accepts empty rows only after receiving the expected report headers", async () => {
  mocks.run.mockImplementation(async (request: Request) => [
    { ...response(request)[0], rows: [], rowCount: 0 },
  ]);
  const report = await fetchRealtimeAnalyticsReport(credentials);
  expect(report.totals.activeUsers).toBe(0);
  expect(report.cities).toEqual([]);
  expect(report.devices).toEqual([]);
  expect(report.minutes.every((minute) => minute.activeUsers === 0)).toBe(true);
  mocks.run.mockResolvedValue([{}]);
  await expect(fetchRealtimeAnalyticsReport(credentials)).rejects.toThrow(
    "Incomplete realtime report",
  );
});
it.each(["30", "-1", "not-a-minute", "1.5"])(
  "rejects invalid minute %s",
  async (value) => {
    mocks.run.mockImplementation(async (request: Request) => {
      const report = response(request);
      if (request.dimensions?.[0].name === "minutesAgo")
        report[0].rows[0].dimensionValues = [{ value }];
      return report;
    });
    await expect(fetchRealtimeAnalyticsReport(credentials)).rejects.toThrow(
      "Invalid realtime minute",
    );
  },
);
it("rejects duplicate minute rows", async () => {
  mocks.run.mockImplementation(async (request: Request) => {
    const report = response(request);
    if (request.dimensions?.[0].name === "minutesAgo")
      report[0].rows[1] = report[0].rows[0];
    return report;
  });
  await expect(fetchRealtimeAnalyticsReport(credentials)).rejects.toThrow(
    "Duplicate realtime minute",
  );
});
it("does not return partial statistics if the city report fails", async () => {
  mocks.run.mockImplementation(async (request: Request) => {
    if (request.dimensions?.[0].name === "city") throw new Error("offline");
    return response(request);
  });
  await expect(fetchRealtimeAnalyticsReport(credentials)).rejects.toThrow(
    "offline",
  );
  expect(mocks.close).toHaveBeenCalledOnce();
});
