"use server";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { requireAdmin, signOut } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { getClientIp } from "@/lib/rate-limit";
import { AppError, type ActionResult } from "@/lib/errors";
import {
  requestAdminEnrollment,
  finishAdminEnrollment,
} from "@/services/admin-mobile.service";

export async function requestAdminMobileAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof requestAdminEnrollment>>>> {
  const admin = await requireAdmin();
  try {
    return {
      ok: true,
      data: await requestAdminEnrollment(
        input,
        admin,
        getClientIp(await headers(), getEnv().AUTH_TRUST_PROXY_HEADERS),
      ),
    };
  } catch (error: unknown) {
    unstable_rethrow(error);
    return {
      ok: false,
      error:
        error instanceof AppError ? error.message : "انجام درخواست ممکن نشد",
    };
  }
}
export async function finishAdminMobileAction(
  input: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  try {
    await finishAdminEnrollment(
      input,
      admin,
      getClientIp(await headers(), getEnv().AUTH_TRUST_PROXY_HEADERS),
    );
  } catch (error: unknown) {
    unstable_rethrow(error);
    return {
      ok: false,
      error:
        error instanceof AppError ? error.message : "انجام درخواست ممکن نشد",
    };
  }
  await signOut({ redirectTo: "/login?callbackUrl=%2Fadmin" });
  return { ok: true, data: undefined };
}
