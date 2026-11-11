import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import type { AnalyticsDiagnostic } from "@/types/analytics";

vi.mock("@/actions/admin/analytics.actions", () => ({
  refreshAnalyticsAction: vi.fn(),
}));

it.each([
  ["dns", "نتوانست نشانی سرویس گوگل را پیدا کند"],
  ["timeout", "مهلت اتصال یا دریافت پاسخ از گوگل تمام شد"],
  ["key-invalid", "کلید خصوصی در سرور قابل پردازش نیست"],
  ["token-rejected", "گوگل احراز هویت حساب سرویس را رد کرده است"],
  [
    "response-invalid",
    "پاسخ دریافت‌شده از گوگل با قالب مورد انتظار گزارش سازگار نیست",
  ],
  ["time-zone-missing", "پاسخ گوگل منطقهٔ زمانی پراپرتی را مشخص نکرده است"],
] satisfies [AnalyticsDiagnostic, string][])(
  "renders actionable Persian diagnostics without statistics for %s",
  (diagnostic, text) => {
    const html = renderToStaticMarkup(
      <AnalyticsDashboard
        days="7"
        initialResult={{ ok: false, code: "connection", diagnostic }}
      />,
    );
    expect(html).toContain(text);
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("کاربران فعال</h2>");
    expect(html).not.toContain("داده‌ای برای این بازه ثبت نشده است");
    expect(html).not.toContain("GoogleAnalyticsDataClient");
  },
);

it("renders failures cached before diagnostics were introduced", () => {
  const html = renderToStaticMarkup(
    <AnalyticsDashboard
      days="7"
      initialResult={{ ok: false, code: "connection" }}
    />,
  );
  expect(html).toContain("دریافت گزارش از گوگل انجام نشد");
  expect(html).not.toContain("جزئیات بررسی:");
});

it("renders real realtime metrics without historical cards or invented comparisons", () => {
  const html = renderToStaticMarkup(
    <AnalyticsDashboard
      days="realtime"
      initialResult={{
        ok: true,
        report: {
          days: "realtime",
          fetchedAt: "2026-11-11T09:00:00Z",
          totals: { activeUsers: 3, screenPageViews: 12 },
          cities: [
            { city: "Tabriz", activeUsers: 3 },
            { city: "(not set)", activeUsers: 1 },
          ],
          devices: [
            { category: "mobile", activeUsers: 1 },
            { category: "tablet", activeUsers: 1 },
            { category: "desktop", activeUsers: 1 },
          ],
          minutes: [{ minutesAgo: 0, activeUsers: 1, screenPageViews: 2 }],
        },
      }}
    />,
  );
  expect(html).toContain("۳۰ دقیقهٔ گذشته");
  expect(html).toContain("کاربران فعال در ۳۰ دقیقهٔ گذشته");
  expect(html).toContain("گزارش بلادرنگ");
  expect(html).toContain("Tabriz");
  expect(html).toContain("نوع دستگاه کاربران");
  expect(html).toContain("موبایل");
  expect(html).toContain("تبلت");
  expect(html).toContain("کامپیوتر");
  expect(html).toContain("نامشخص");
  expect(html).not.toContain("امروز تا این لحظه");
  expect(html).not.toContain("بازهٔ مقایسه:");
  expect(html).not.toContain("مقدار قبلی:");
  expect(html).not.toContain("کاربران جدید</h2>");
  expect(html).not.toContain("نشست‌ها</h2>");
  expect(html).not.toContain("NaN");
});
