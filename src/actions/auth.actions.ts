"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { unstable_rethrow } from "next/navigation";
import {
  signIn,
  signOut,
  getCurrentUser as checkCurrentUser,
  requireUser as checkUser,
  requireAdmin as checkAdmin,
  consumeCurrentAuthAttempt,
} from "@/lib/auth";
import { safeCallbackUrl } from "@/validations/auth";
import { mobilePasswordSchema } from "@/validations/otp";
import type { AuthActionState } from "@/types/auth";

const rateLimitMessage =
  "تعداد تلاش‌ها بیش از حد مجاز است؛ پس از ۱۵ دقیقه دوباره تلاش کنید";

export async function loginAction(
  _state: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  const parsed = mobilePasswordSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    if (
      !(await consumeCurrentAuthAttempt(
        "login",
        form.get("mobile") ?? form.get("email"),
      ))
    )
      return { ok: false, error: rateLimitMessage };
    return {
      ok: false,
      error: "اطلاعات ورود معتبر نیست",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: safeCallbackUrl(form.get("callbackUrl")),
    });
    return { ok: true, data: undefined };
  } catch (error: unknown) {
    unstable_rethrow(error);
    if (error instanceof CredentialsSignin)
      return {
        ok: false,
        error:
          error.code === "rate_limit"
            ? rateLimitMessage
            : "شماره یا رمز عبور معتبر نیست",
      };
    if (error instanceof AuthError) {
      console.error("Authentication failed:", error.type);
      return { ok: false, error: "خطایی رخ داد، دوباره تلاش کنید" };
    }
    console.error("Login failed");
    return { ok: false, error: "خطایی رخ داد، دوباره تلاش کنید" };
  }
}

// Reject stale clients that still hold a reference to the retired email signup action.
export async function registerAction(): Promise<AuthActionState> {
  return {
    ok: false,
    error: "ثبت‌نام فقط با تأیید شمارهٔ موبایل انجام می‌شود",
  };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

// Server components use these actions to respect the project's layer import rules.
export async function requireUser() {
  return checkUser();
}
export async function requireAdmin() {
  return await checkAdmin();
}

export async function getCurrentUser() {
  return checkCurrentUser();
}
