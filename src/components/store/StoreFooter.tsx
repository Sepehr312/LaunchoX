import { ArcticFooter } from "@/components/store/ArcticFooter";
import { getSiteSettings } from "@/services/site.service";

export async function StoreFooter() {
  return <ArcticFooter site={await getSiteSettings()} />;
}
