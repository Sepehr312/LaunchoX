import type { Metadata } from "next";
import { requireAdmin } from "@/actions/auth.actions";
import { getAnalyticsReport } from "@/services/analytics.service";
import { analyticsQuerySchema } from "@/validations/analytics";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = {
  title: "آمار و عملکرد | مدیریت لانچو ایکس",
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const query = analyticsQuerySchema.safeParse(await searchParams);
  const days = query.success ? query.data.days : "7";
  const result = query.success
    ? await getAnalyticsReport(query.data)
    : { ok: false as const, code: "invalid" as const };
  return (
    <AnalyticsDashboard
      key={
        result.ok
          ? `${days}:${result.report.fetchedAt}`
          : `${days}:${result.code}`
      }
      days={days}
      initialResult={result}
    />
  );
}
