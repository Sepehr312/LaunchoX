import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { initialPasswordAvailable } from "@/actions/otp.actions";
import { InitialPasswordForm } from "@/components/auth/InitialPasswordForm";
import { safeCallbackUrl } from "@/validations/auth";

export const metadata: Metadata = { title: "تعیین رمز دلخواه | لانچ‌اوکس" };
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const callbackUrl = safeCallbackUrl((await searchParams).callbackUrl);
  if (!(await initialPasswordAvailable()))
    redirect(
      callbackUrl === "/account/welcome" ||
        callbackUrl.startsWith("/account/welcome?")
        ? "/account"
        : callbackUrl,
    );
  return <InitialPasswordForm callbackUrl={callbackUrl} />;
}
