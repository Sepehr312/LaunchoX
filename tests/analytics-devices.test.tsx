import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AnalyticsDevices } from "@/components/admin/AnalyticsDevices";

it("shows an explicit empty state without manufacturing device rows", () => {
  const html = renderToStaticMarkup(<AnalyticsDevices devices={[]} />);
  expect(html).toContain("در این بازه نوع دستگاهی گزارش نشده است");
  expect(html).not.toContain("<tbody>");
});

it("labels missing and future categories without treating them as known devices", () => {
  const html = renderToStaticMarkup(
    <AnalyticsDevices
      devices={[
        { category: "(not set)", activeUsers: 2 },
        { category: "future-device", activeUsers: 1 },
      ]}
    />,
  );
  expect(html).toContain("نامشخص");
  expect(html).toContain("سایر دستگاه‌ها");
  expect(html).not.toContain("موبایل");
  expect(html).not.toContain("future-device");
});
