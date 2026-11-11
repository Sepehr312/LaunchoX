import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { LaunchoAssistant } from "@/components/layout/LaunchoAssistant";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import "./globals.css";

const vazirmatn = localFont({
  src: "./fonts/vazirmatn-variable.ttf",
  weight: "100 900",
  variable: "--font-vazirmatn",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Vazirmatn Fallback"],
});

export const metadata: Metadata = {
  title: `فروشگاه تخصصی یخچال | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
  description:
    "فروشگاه تخصصی یخچال و تجهیزات سرمایشی با انتخاب دقیق و مشخصات شفاف",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const env = getEnv();
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazirmatn.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-hidden">
        {children}
        {env.NODE_ENV === "production" && env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics measurementId={env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
        <LaunchoAssistant />
      </body>
    </html>
  );
}
