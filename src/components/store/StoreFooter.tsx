import { ArcticFooter } from "@/components/store/ArcticFooter";
import { getSiteSettings } from "@/services/site.service";

export function StoreFooter() {
  return <ArcticFooter site={getSiteSettings()} />;
}
