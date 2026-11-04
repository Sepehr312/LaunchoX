import type { MetadataRoute } from "next";
import { getEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/account"] },
    sitemap: new URL("/sitemap.xml", getEnv().NEXT_PUBLIC_SITE_URL).href,
  };
}
