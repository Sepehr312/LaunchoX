"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  analyticsPath,
  createPageAnalytics,
} from "@/components/analytics/page-analytics";

let trackPage: ReturnType<typeof createPageAnalytics> | undefined;

export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    trackPage ??= createPageAnalytics(window, measurementId);
    trackPage(pathname, window.location.origin);
  }, [pathname, measurementId]);

  if (!analyticsPath(pathname)) return null;

  return (
    <Script
      id="launchox-ga4"
      src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      strategy="afterInteractive"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
