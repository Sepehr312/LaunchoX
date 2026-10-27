import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import { z } from "zod";
import { AuthForm } from "@/components/auth/AuthForm";
import { PremiumAuthLayout } from "@/components/auth/PremiumAuthLayout";
import { safeCallbackUrl } from "@/validations/auth";

export const metadata: Metadata = {
  title: `ورود | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = z
    .object({
      callbackUrl: z.unknown(),
      error: z
        .enum(["CredentialsSignin", "Configuration", "AccessDenied"])
        .optional(),
      code: z.enum(["credentials", "rate_limit"]).optional(),
    })
    .safeParse(await searchParams);
  const callbackUrl = safeCallbackUrl(
    query.success ? query.data.callbackUrl : undefined,
  );
  const initialError =
    query.success && query.data.error
      ? query.data.code === "rate_limit"
        ? "تعداد تلاش‌ها بیش از حد مجاز است؛ پس از ۱۵ دقیقه دوباره تلاش کنید"
        : query.data.error === "CredentialsSignin"
          ? "ایمیل یا رمز عبور اشتباه است"
          : "خطایی رخ داد، دوباره تلاش کنید"
      : undefined;
  return (
    <PremiumAuthLayout>
      <AuthForm
        mode="login"
        appearance="premium"
        callbackUrl={callbackUrl}
        initialError={initialError}
      />
    </PremiumAuthLayout>
  );
}
