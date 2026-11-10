import type { Metadata } from "next";
import { CustomerDashboard } from "@/components/customer/CustomerDashboard";

export const metadata: Metadata = { title: "سفارش‌های من | لانچو ایکس" };

export default function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CustomerDashboard view="orders" searchParams={searchParams} />;
}
