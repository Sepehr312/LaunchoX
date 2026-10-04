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
import { AppError } from "@/lib/errors";
import {
  loginSchema,
  registerSchema,
  safeCallbackUrl,
} from "@/validations/auth";
import { registerUser } from "@/services/auth.service";
import type { AuthActionState } from "@/types/auth";

const rateLimitMessage =
  "تعداد تلاش‌ها بیش از حد مجاز است؛ پس از ۱۵ دقیقه دوباره تلاش کنید";

export async function loginAction(
  _state: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    if (!(await consumeCurrentAuthAttempt("login")))
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
            : "ایمیل یا رمز عبور اشتباه است",
      };
    if (error instanceof AuthError) {
      console.error("Authentication failed:", error.type);
      return { ok: false, error: "خطایی رخ داد، دوباره تلاش کنید" };
    }
    console.error("Login failed");
    return { ok: false, error: "خطایی رخ داد، دوباره تلاش کنید" };
  }
}

export async function registerAction(
  _state: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  if (!(await consumeCurrentAuthAttempt("register")))
    return { ok: false, error: rateLimitMessage };
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      ok: false,
      error: "اطلاعات ثبت‌نام معتبر نیست",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  try {
    await registerUser(parsed.data);
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeCallbackUrl(form.get("callbackUrl")),
    });
    return { ok: true, data: undefined };
  } catch (error: unknown) {
    unstable_rethrow(error);
    if (error instanceof AppError) return { ok: false, error: error.message };
    if (error instanceof CredentialsSignin && error.code === "rate_limit")
      return {
        ok: false,
        error: "حساب ساخته شد؛ پس از ۱۵ دقیقه از صفحهٔ ورود وارد شوید",
      };
    console.error("Registration failed");
    return { ok: false, error: "خطایی رخ داد، دوباره تلاش کنید" };
  }
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
