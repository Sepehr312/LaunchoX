import type { Metadata } from "next";
import { z } from "zod";
import { AuthForm } from "@/components/auth/AuthForm";
import { PremiumAuthLayout } from "@/components/auth/PremiumAuthLayout";
import { safeCallbackUrl } from "@/validations/auth";

export const metadata: Metadata = {
  title: "پیش‌نمایش ورود | لانچ‌اوکس",
  robots: { index: false, follow: false },
};

export default async function PremiumLoginPage({
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
    <PremiumAuthLayout>
      <AuthForm
        mode="login"
        appearance="premium"
        linkMode="preview"
        callbackUrl={callbackUrl}
      />
    </PremiumAuthLayout>
  );
}
