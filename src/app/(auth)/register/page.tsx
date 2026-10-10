import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { safeCallbackUrl } from "@/validations/auth";

export const metadata: Metadata = {
  title: `ثبت‌نام | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AuthForm
      mode="register"
      callbackUrl={safeCallbackUrl((await searchParams).callbackUrl)}
    />
  );
}
