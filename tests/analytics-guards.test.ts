import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ guard: vi.fn(), report: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.guard }));
vi.mock("@/actions/auth.actions", () => ({ requireAdmin: mocks.guard }));
vi.mock("@/services/analytics.service", () => ({
  getAnalyticsReport: mocks.report,
}));
vi.mock("@/components/admin/AnalyticsDashboard", () => ({
  AnalyticsDashboard: () => null,
}));
import { refreshAnalyticsAction } from "@/actions/admin/analytics.actions";
import AnalyticsPage from "@/app/admin/analytics/page";

beforeEach(() => vi.resetAllMocks());
it.each(["guest", "customer"])(
  "denies %s before report input or Google is used",
  async (role) => {
    mocks.guard.mockRejectedValue(
      new Error(role === "guest" ? "redirect" : "not-found"),
    );
    await expect(refreshAnalyticsAction({ days: "7" })).rejects.toThrow();
    await expect(
      AnalyticsPage({ searchParams: Promise.resolve({ days: "7" }) }),
    ).rejects.toThrow();
    expect(mocks.report).not.toHaveBeenCalled();
  },
);
it("validates manual requests before entering the service", async () => {
  expect(await refreshAnalyticsAction({ days: "365" })).toEqual({
    ok: false,
    code: "invalid",
  });
  expect(mocks.report).not.toHaveBeenCalled();
  mocks.report.mockResolvedValue({ ok: false, code: "configuration" });
  expect(await refreshAnalyticsAction({ days: "30" })).toEqual({
    ok: false,
    code: "configuration",
  });
  expect(mocks.report).toHaveBeenCalledWith({ days: "30" }, true);
});
it("rejects duplicated or unknown URL parameters", async () => {
  await AnalyticsPage({ searchParams: Promise.resolve({ days: ["7", "30"] }) });
  await AnalyticsPage({ searchParams: Promise.resolve({ property: "other" }) });
  expect(mocks.report).not.toHaveBeenCalled();
});
