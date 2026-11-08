"use server";

import { cookies, headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { signIn, signOut, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { getClientIp } from "@/lib/rate-limit";
import { AppError, type ActionResult } from "@/lib/errors";
import {
  requestOtp,
  discardInitialPasswordGrant,
  hasInitialPasswordGrant,
} from "@/services/otp.service";
import {
  setInitialPassword,
  setPasswordWithOtp,
  changeMobileWithOtp,
} from "@/services/credential-security.service";
import { safeCallbackUrl } from "@/validations/auth";
import { otpRequestSchema, otpVerifySchema } from "@/validations/otp";

async function currentIp() {
  return getClientIp(await headers(), getEnv().AUTH_TRUST_PROXY_HEADERS);
}
function failure(error: unknown): ActionResult<never> {
  unstable_rethrow(error);
  if (error instanceof z.ZodError)
    return {
      ok: false,
      error: "اطلاعات واردشده معتبر نیست",
      fieldErrors: error.flatten().fieldErrors,
    };
  if (error instanceof AppError) return { ok: false, error: error.message };
  return { ok: false, error: "انجام درخواست ممکن نشد؛ دوباره تلاش کنید" };
}

export async function requestOtpAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof requestOtp>>>> {
  try {
    const data = otpRequestSchema.parse(input);
    if (data.purpose === "admin-enrollment")
      return { ok: false, error: "این عملیات در دسترس نیست" };
    const actor = ["set-password", "change-mobile"].includes(data.purpose)
      ? await requireUser()
      : undefined;
    return { ok: true, data: await requestOtp(data, await currentIp(), actor) };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function verifyLoginOtpAction(
  input: unknown,
  callback: unknown,
): Promise<ActionResult> {
  const callbackUrl = safeCallbackUrl(callback);
  try {
    const data = otpVerifySchema.parse(input);
    if (data.purpose !== "login")
      return { ok: false, error: "درخواست معتبر نیست" };
    await signIn("otp", { ...data, redirect: false });
  } catch (error: unknown) {
    return failure(error);
  }
  const token = (await cookies()).get("initial_password")?.value;
  redirect(
    token
      ? `/account/welcome?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : callbackUrl,
  );
}

export async function initialPasswordAvailable() {
  const user = await requireUser();
  return hasInitialPasswordGrant(
    (await cookies()).get("initial_password")?.value,
    user,
  );
}

export async function initialPasswordAction(
  _state: ActionResult | undefined,
  form: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const callbackUrl = safeCallbackUrl(form.get("callbackUrl"));
  const store = await cookies();
  try {
    const operation = z.enum(["skip", "save"]).parse(form.get("operation"));
    const token = store.get("initial_password")?.value;
    if (operation === "skip") await discardInitialPasswordGrant(token, user);
    else {
      await setInitialPassword(Object.fromEntries(form), token, user);
      // The password mutation revokes every older JWT; issue a fresh Auth.js session.
      const { getProfile } = await import("@/services/user.service");
      const profile = await getProfile(user.id);
      await signIn("credentials", {
        mobile: profile.mobile,
        password: form.get("password"),
        redirect: false,
      });
    }
    store.delete("initial_password");
  } catch (error: unknown) {
    return failure(error);
  }
  redirect(callbackUrl);
}

export async function passwordOtpAction(
  input: unknown,
  callback: unknown,
): Promise<ActionResult> {
  try {
    const data = otpVerifySchema.parse(input);
    const user =
      data.purpose === "set-password" ? await requireUser() : undefined;
    await setPasswordWithOtp(input, await currentIp(), user);
  } catch (error: unknown) {
    return failure(error);
  }
  // Reauthentication also covers failed session renewal without leaving a stale active session.
  await signOut({
    redirectTo: `/login?callbackUrl=${encodeURIComponent(safeCallbackUrl(callback))}`,
  });
  return { ok: true, data: undefined };
}

export async function changeMobileOtpAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await changeMobileWithOtp(input, await currentIp(), user);
  } catch (error: unknown) {
    return failure(error);
  }
  await signOut({ redirectTo: "/login?callbackUrl=%2Faccount%2Fprofile" });
  return { ok: true, data: undefined };
}
