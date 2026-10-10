import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import { SiteTheme } from "@/components/ui/SiteTheme";
import "./globals.css";

// Resolve the shared header preference before the first page paint.
const initialThemeScript = `(() => {
  let theme;
  try { theme = localStorage.getItem("launchox-preview-theme"); } catch {}
  document.documentElement.dataset.theme = theme === "light" || theme === "dark"
    ? theme
    : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
})();`;

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `فروشگاه تخصصی یخچال | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
  description:
    "فروشگاه تخصصی یخچال و تجهیزات سرمایشی با انتخاب دقیق و مشخصات شفاف",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazirmatn.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: initialThemeScript }} />
      </head>
      <body className="flex min-h-full flex-col overflow-x-hidden">
        <SiteTheme />
        {children}
      </body>
    </html>
  );
}
