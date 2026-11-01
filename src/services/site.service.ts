import "server-only";
import { getEnv } from "@/lib/env";
import { formatYear } from "@/lib/format";

export function getSiteSettings() {
  const env = getEnv();
  return {
    name: env.NEXT_PUBLIC_SITE_NAME,
    phone: env.CONTACT_PHONE,
    email: env.CONTACT_EMAIL,
    address: env.CONTACT_ADDRESS,
    year: formatYear(new Date()),
  };
}
