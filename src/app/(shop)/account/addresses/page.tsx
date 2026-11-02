import type { Metadata } from "next";
import { CustomerDashboard } from "@/components/customer/CustomerDashboard";

export const metadata: Metadata = { title: "آدرس‌های من | لانچ‌اوکس" };

export default function AddressesPage() {
  return (
    <CustomerDashboard view="addresses" searchParams={Promise.resolve({})} />
  );
}
