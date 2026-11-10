import { describe, expect, it, vi } from "vitest";
import {
  analyticsPath,
  createPageAnalytics,
  type AnalyticsWindow,
} from "@/components/analytics/page-analytics";

const id = "G-G60YTNFZEF";
const origin = "https://shop.example";

describe("page analytics", () => {
  it("records initial, distinct navigation and back visits once, including effect replays", () => {
    const gtag = vi.fn();
    const target: AnalyticsWindow = { gtag };
    const visit = createPageAnalytics(target, id);
    for (const path of ["/", "/", "/products", "/products", "/", "/"]) {
      visit(path, origin);
    }
    const events = gtag.mock.calls.filter(([command]) => command === "event");
    expect(events.map((call) => call[2].page_location)).toEqual([
      `${origin}/`,
      `${origin}/products`,
      `${origin}/`,
    ]);
    expect(
      gtag.mock.calls.filter(([command]) => command === "config"),
    ).toHaveLength(1);
    expect(gtag).toHaveBeenCalledWith(
      "config",
      id,
      expect.objectContaining({
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      }),
    );
    expect(events.every((call) => call[1] === "page_view")).toBe(true);
  });

  it("does not initialize on admin, auth, account, checkout or unknown paths", () => {
    const target: AnalyticsWindow = {};
    const visit = createPageAnalytics(target, id);
    for (const path of [
      "/admin",
      "/admin/users",
      "/login",
      "/account/orders/private-id",
      "/checkout/result",
      "/unknown",
    ]) {
      visit(path, origin);
      expect(target[`ga-disable-${id}`]).toBe(true);
      expect(target.gtag).toBeUndefined();
      expect(target.dataLayer).toBeUndefined();
    }
  });

  it("disables an already loaded tag on excluded routes and resumes on return", () => {
    const target: AnalyticsWindow = { gtag: vi.fn() };
    const visit = createPageAnalytics(target, id);
    visit("/products", origin);
    visit("/admin/orders/token", origin);
    expect(target[`ga-disable-${id}`]).toBe(true);
    visit("/products", origin);
    expect(target[`ga-disable-${id}`]).toBe(false);
    expect(
      vi
        .mocked(target.gtag!)
        .mock.calls.filter(([command]) => command === "event"),
    ).toHaveLength(2);
    expect(JSON.stringify(vi.mocked(target.gtag!).mock.calls)).not.toContain(
      "token",
    );
  });

  it("masks arbitrary dynamic segments while counting distinct catalog navigations", () => {
    const target: AnalyticsWindow = {};
    const visit = createPageAnalytics(target, id);
    visit("/products/private@example.com", origin);
    visit("/products/09123456789", origin);
    const calls = target.dataLayer!.map((item) =>
      Array.from(item as IArguments),
    );
    const events = calls.filter(([command]) => command === "event");
    expect(events).toHaveLength(2);
    expect(JSON.stringify(calls)).not.toMatch(/private@example|09123456789/);
    expect(events[0][2]).toEqual({
      page_location: `${origin}/products/[slug]`,
      page_referrer: "",
      page_title: "لانچو ایکس",
      send_to: id,
    });
  });

  it.each([
    null,
    "/search?q=private@example.com",
    "/products#token",
    "/admin/../products",
    "/products/a/b",
    "/products\\private",
    "//other.test",
  ])("rejects unsafe or unknown paths: %s", (path) =>
    expect(analyticsPath(path)).toBeNull(),
  );
});
