import "server-only";
import { readContent } from "@/services/content.service";
import { getEnv } from "@/lib/env";
import { formatYear } from "@/lib/format";

export async function getSiteSettings() {
  const env = getEnv();
  const saved = await readContent("contact");
  const contact = saved?.key === "contact" ? saved.data : null;
  return {
    name: env.NEXT_PUBLIC_SITE_NAME,
    phone: contact?.phone ?? env.CONTACT_PHONE,
    email: contact?.email ?? env.CONTACT_EMAIL,
    address: contact?.address ?? env.CONTACT_ADDRESS,
    year: formatYear(new Date()),
  };
}
