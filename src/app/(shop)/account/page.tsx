import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/actions/auth.actions";
import { CustomerDashboard } from "@/components/customer/CustomerDashboard";

export const metadata: Metadata = { title: "داشبورد مشتری | لانچو ایکس" };

export default async function AccountPage() {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin");
  return <CustomerDashboard searchParams={Promise.resolve({})} />;
}
