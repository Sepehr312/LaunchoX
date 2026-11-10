import type { Metadata } from "next";
import { CustomerDashboard } from "@/components/customer/CustomerDashboard";

export const metadata: Metadata = { title: "پروفایل و امنیت | لانچو ایکس" };

export default function ProfilePage() {
  return (
    <CustomerDashboard view="profile" searchParams={Promise.resolve({})} />
  );
}
