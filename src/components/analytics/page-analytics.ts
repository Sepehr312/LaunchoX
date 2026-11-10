import { z } from "zod";

const pathnameSchema = z
  .string()
  .max(2048)
  .regex(/^\/(?:[^?#\\\s]*)$/);
const staticPages = new Set([
  "/",
  "/products",
  "/categories",
  "/brands",
  "/search",
  "/compare",
  "/about",
  "/services",
  "/cart",
]);

export function analyticsPath(input: unknown): string | null {
  const result = pathnameSchema.safeParse(input);
  if (!result.success) return null;
  const pathname = result.data.replace(/\/$/, "") || "/";
  if (staticPages.has(pathname)) return pathname;
  // Only route templates leave the browser; slugs can contain arbitrary input.
  const catalog = /^\/(products|categories|brands)\/[^/]+$/.exec(pathname);
  return catalog ? `/${catalog[1]}/[slug]` : null;
}

type Tag = (...args: unknown[]) => void;
export type AnalyticsWindow = {
  dataLayer?: unknown[];
  gtag?: Tag;
  [key: `ga-disable-${string}`]: boolean | undefined;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Tag;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

export function createPageAnalytics(
  target: AnalyticsWindow,
  measurementId: string,
) {
  let initialized = false;
  let lastPathname: string | null = null;

  return (pathname: unknown, origin: string) => {
    const path = analyticsPath(pathname);
    target[`ga-disable-${measurementId}`] = !path;
    if (!path) {
      lastPathname = null;
      // Clear the context used by delayed engagement events before leaving the shop.
      target.gtag?.("set", {
        page_location: `${origin}/`,
        page_referrer: "",
        page_title: "لانچو ایکس",
      });
      return;
    }

    if (!initialized) {
      target.dataLayer ??= [];
      target.gtag ??= function () {
        // Google tag commands require an Arguments object in the data layer.
        // eslint-disable-next-line prefer-rest-params -- Preserve the Google tag command protocol.
        target.dataLayer?.push(arguments);
      };
      target.gtag("consent", "default", {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      target.gtag("js", new Date());
      target.gtag("config", measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        ignore_referrer: true,
        page_location: `${origin}${path}`,
        page_referrer: "",
        page_title: "لانچو ایکس",
      });
      initialized = true;
    }

    const context = {
      page_location: `${origin}${path}`,
      page_referrer: "",
      page_title: "لانچو ایکس",
    };
    target.gtag?.("set", context);
    if (lastPathname === pathname) return;
    lastPathname = typeof pathname === "string" ? pathname : null;
    target.gtag?.("event", "page_view", {
      ...context,
      send_to: measurementId,
    });
  };
}
