import { beforeEach, expect, it, vi } from "vitest";
import type { protos } from "@google-analytics/data";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ run: vi.fn(), close: vi.fn() }));
vi.mock("@google-analytics/data", () => ({
  BetaAnalyticsDataClient: class {
    runReport = mocks.run;
    close = mocks.close;
  },
}));
import {
  analyticsErrorCode,
  fetchAnalyticsReport,
  reportTotals,
} from "@/lib/ga4";
type Request = protos.google.analytics.data.v1beta.IRunReportRequest;
const credentials = {
  GA4_PROPERTY_ID: "563535207",
  GOOGLE_CLIENT_EMAIL: "test@example.com",
  GOOGLE_PRIVATE_KEY: "TEST-ONLY",
};

function respond(request: Request) {
  const metadata = { timeZone: "America/Los_Angeles" };
  const metricHeaders = request.metrics?.map((metric) => ({
    name: metric.name,
  }));
  if (!request.dimensions) {
    return [
      {
        metadata,
        metricHeaders,
        rows: [
          { metricValues: request.metrics?.map(() => ({ value: "123" })) },
        ],
      },
    ];
  }
  const name = request.dimensions[0].name;
  const dimensionHeaders = [{ name }];
  const date = request.dateRanges?.[0].startDate?.replaceAll("-", "");
  return [
    {
      metadata,
      metricHeaders,
      dimensionHeaders,
      rows: [
        {
          dimensionValues: [
            {
              value:
                name === "date"
                  ? date
                  : name === "pagePath"
                    ? "/products/[slug]"
                    : name === "city"
                      ? "Tabriz"
                      : name === "deviceCategory"
                        ? "mobile"
                        : "google / organic",
            },
          ],
          metricValues: request.metrics?.map(() => ({ value: "100" })),
        },
      ],
    },
  ];
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.close.mockResolvedValue(undefined);
  mocks.run.mockImplementation(async (request: Request) => respond(request));
});

it.each([7, 30] as const)(
  "requests device users in the same %s day property range",
  async (days) => {
    const report = await fetchAnalyticsReport(credentials, days);
    const request = mocks.run.mock.calls
      .map(([value]) => value as Request)
      .find((value) => value.dimensions?.[0].name === "deviceCategory");
    expect(request?.dateRanges).toEqual([report.range]);
    expect(request?.metrics).toEqual([{ name: "activeUsers" }]);
    expect(report.devices).toEqual([{ category: "mobile", activeUsers: 100 }]);
    expect(report.totals.activeUsers).toBe(123);
  },
);

it("rejects a failed device report instead of returning partial historical statistics", async () => {
  mocks.run.mockImplementation(async (request: Request) => {
    if (request.dimensions?.[0].name === "deviceCategory")
      throw new Error("offline");
    return respond(request);
  });
  await expect(fetchAnalyticsReport(credentials, 7)).rejects.toThrow("offline");
});

it("accepts the successful headerless zero-row response observed from Google", async () => {
  mocks.run.mockResolvedValue([
    {
      kind: "analyticsData#runReport",
      metricHeaders: [],
      dimensionHeaders: [],
      rows: [],
      rowCount: 0,
      metadata: { timeZone: "Asia/Tehran" },
    },
  ]);
  const report = await fetchAnalyticsReport(credentials, 7);
  expect(report.totals).toEqual({
    activeUsers: 0,
    newUsers: 0,
    screenPageViews: 0,
    sessions: 0,
  });
  expect(report.previous).toEqual(report.totals);
  expect(report.daily).toHaveLength(7);
  expect(
    report.daily.every(
      (day) => day.activeUsers === 0 && day.screenPageViews === 0,
    ),
  ).toBe(true);
  expect(report.pages).toEqual([]);
  expect(report.sources).toEqual([]);
  expect(mocks.run).toHaveBeenCalledTimes(8);
});

it("preserves current data when only the previous comparison period is headerless and empty", async () => {
  let aggregates = 0;
  mocks.run.mockImplementation(async (request: Request) => {
    if (
      !request.dimensions &&
      request.metrics?.length === 4 &&
      ++aggregates === 2
    ) {
      return [
        {
          kind: "analyticsData#runReport",
          rowCount: 0,
          rows: [],
          metricHeaders: [],
          dimensionHeaders: [],
          metadata: { timeZone: "America/Los_Angeles" },
        },
      ];
    }
    return respond(request);
  });
  const report = await fetchAnalyticsReport(credentials, 7);
  expect(report.totals.activeUsers).toBe(123);
  expect(report.previous.activeUsers).toBe(0);
  expect(report.sources).toHaveLength(1);
  expect(report.pages).toHaveLength(1);
});

it("does not mistake malformed, incomplete or partially headed reports for empty data", () => {
  const empty = {
    kind: "analyticsData#runReport",
    rowCount: 0,
    metadata: { timeZone: "Asia/Tehran" },
  };
  for (const report of [
    {},
    { ...empty, kind: "" },
    { ...empty, metadata: {} },
    { ...empty, rowCount: 1 },
    { ...empty, rowCount: undefined },
    { ...empty, rows: [{ metricValues: [{ value: "10" }] }] },
    { ...empty, metricHeaders: [{ name: "activeUsers" }] },
  ])
    expect(() => reportTotals(report)).toThrow();
});

it("marks Google empty-reason restrictions instead of asserting unrestricted zero activity", async () => {
  mocks.run.mockResolvedValue([
    {
      kind: "analyticsData#runReport",
      rowCount: 0,
      metadata: {
        timeZone: "Asia/Tehran",
        emptyReason: "TEST-ONLY-RESTRICTION",
      },
    },
  ]);
  expect((await fetchAnalyticsReport(credentials, 30)).limitedData).toBe(true);
});

it("returns an empty range only after every Google report succeeds", async () => {
  mocks.run.mockImplementation(async (request: Request) => [
    {
      metadata: { timeZone: "Asia/Tehran" },
      metricHeaders: request.metrics?.map(({ name }) => ({ name })),
      dimensionHeaders: request.dimensions?.map(({ name }) => ({ name })),
      rowCount: 0,
    },
  ]);
  const report = await fetchAnalyticsReport(credentials, 7);
  expect(Object.values(report.totals)).toEqual([0, 0, 0, 0]);
  expect(report.sources).toEqual([]);
  expect(report.pages).toEqual([]);
  expect(
    report.daily.every(
      (day) => day.activeUsers === 0 && day.screenPageViews === 0,
    ),
  ).toBe(true);
});

it("rejects incomplete table responses instead of filling failed tables with zeros", async () => {
  mocks.run.mockImplementation(async (request: Request) => {
    if (request.dimensions?.[0].name === "date")
      return [{ metadata: { timeZone: "America/Los_Angeles" }, rowCount: 1 }];
    return respond(request);
  });
  await expect(fetchAnalyticsReport(credentials, 7)).rejects.toThrow(
    "Incomplete analytics table",
  );
});

it("requests official metrics, aggregate totals and explicit property-zone dates", async () => {
  const report = await fetchAnalyticsReport(credentials, 7);
  expect(report.totals.activeUsers).toBe(123);
  expect(report.daily.reduce((total, day) => total + day.activeUsers, 0)).toBe(
    100,
  );
  expect(report.daily).toHaveLength(7);
  expect(report.sources).toEqual([
    {
      source: "google / organic",
      sessions: 100,
    },
  ]);
  expect(report.pages).toEqual([{ path: "/products/[slug]", views: 100 }]);
  expect(report.cities).toEqual([{ city: "Tabriz", activeUsers: 100 }]);
  expect(report.devices).toEqual([{ category: "mobile", activeUsers: 100 }]);
  expect(mocks.run).toHaveBeenCalledTimes(8);
  const requests = mocks.run.mock.calls.map(([request]) => request as Request);
  expect(
    requests.every((request) => request.property === "properties/563535207"),
  ).toBe(true);
  expect(requests[1].dateRanges).toEqual([report.range]);
  expect(requests[2].dateRanges).toEqual([report.previousRange]);
  expect(requests[1].dimensions).toBeUndefined();
  expect(requests[1].metrics?.map((metric) => metric.name)).toEqual([
    "activeUsers",
    "newUsers",
    "screenPageViews",
    "sessions",
  ]);
  expect(mocks.close).toHaveBeenCalledOnce();
});

it("treats an empty successful aggregate as zero but rejects missing or malformed metrics", () => {
  const metricHeaders = [
    "sessions",
    "newUsers",
    "screenPageViews",
    "activeUsers",
  ].map((name) => ({ name }));
  expect(reportTotals({ metricHeaders }).activeUsers).toBe(0);
  expect(
    reportTotals({
      metricHeaders,
      rows: [
        { metricValues: ["1", "2", "3", "4"].map((value) => ({ value })) },
      ],
    }).activeUsers,
  ).toBe(4);
  expect(() => reportTotals({})).toThrow();
  expect(() => reportTotals({ metricHeaders, rowCount: 1 })).toThrow();
  expect(() =>
    reportTotals({
      metricHeaders,
      rows: [{ metricValues: [{ value: "NaN" }] }],
    }),
  ).toThrow();
});

it("does not return partial statistics when one report fails and sanitizes Google error codes", async () => {
  mocks.run.mockImplementation(async (request: Request) => {
    if (request.dimensions?.[0].name === "pagePath")
      throw { code: 7, message: "TEST-SENSITIVE-DETAIL" };
    return respond(request);
  });
  await expect(fetchAnalyticsReport(credentials, 30)).rejects.toMatchObject({
    code: 7,
  });
  expect(analyticsErrorCode({ code: 7 })).toBe("forbidden");
  expect(analyticsErrorCode({ code: 16 })).toBe("forbidden");
  expect(analyticsErrorCode({ code: 8 })).toBe("quota");
  expect(analyticsErrorCode({ code: 14 })).toBe("connection");
  expect(analyticsErrorCode(new Error("TEST-SENSITIVE-DETAIL"))).toBe(
    "connection",
  );
  expect(mocks.close).toHaveBeenCalledOnce();
});

it("requires property time zone metadata and propagates reporting limitations", async () => {
  mocks.run.mockResolvedValueOnce([{ metadata: {} }]);
  await expect(fetchAnalyticsReport(credentials, 7)).rejects.toThrow(
    "Missing property time zone",
  );
  mocks.run.mockImplementation(async (request: Request) => {
    const [report] = respond(request);
    return [
      {
        ...report,
        metadata: { ...report.metadata, subjectToThresholding: true },
      },
    ];
  });
  expect((await fetchAnalyticsReport(credentials, 7)).limitedData).toBe(true);
});
