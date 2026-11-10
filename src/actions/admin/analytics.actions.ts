"use server";

import { requireAdmin } from "@/lib/auth";
import { getAnalyticsReport } from "@/services/analytics.service";
import { analyticsQuerySchema } from "@/validations/analytics";
import type { AnalyticsResult } from "@/types/analytics";

export async function refreshAnalyticsAction(
  input: unknown,
): Promise<AnalyticsResult> {
  await requireAdmin();
  const query = analyticsQuerySchema.safeParse(input);
  if (!query.success) return { ok: false, code: "invalid" };
  return getAnalyticsReport(query.data, true);
}
