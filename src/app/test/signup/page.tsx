import type { Metadata } from "next";
import { z } from "zod";
import { AuthForm } from "@/components/auth/AuthForm";
import { PremiumAuthLayout } from "@/components/auth/PremiumAuthLayout";
import { safeCallbackUrl } from "@/validations/auth";

export const metadata: Metadata = {
  title: "پیش‌نمایش ثبت‌نام | لانچ‌اوکس",
  robots: { index: false, follow: false },
};

export default async function PremiumSignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = z
    .object({ callbackUrl: z.unknown() })
    .safeParse(await searchParams);
  const callbackUrl = safeCallbackUrl(
    query.success ? query.data.callbackUrl : undefined,
  );

  return (
    <PremiumAuthLayout register>
      <AuthForm
        mode="register"
        appearance="premium"
        linkMode="preview"
        callbackUrl={callbackUrl}
      />
    </PremiumAuthLayout>
  );
}
