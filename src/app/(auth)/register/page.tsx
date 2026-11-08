import { redirect } from "next/navigation";
import { safeCallbackUrl } from "@/validations/auth";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(
    `/login?callbackUrl=${encodeURIComponent(safeCallbackUrl((await searchParams).callbackUrl))}`,
  );
}
