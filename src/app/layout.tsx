import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";

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
    >
      <body className="flex min-h-full flex-col overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
