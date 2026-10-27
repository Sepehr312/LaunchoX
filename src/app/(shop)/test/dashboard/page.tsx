import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/actions/auth.actions";
import { getProfile } from "@/services/user.service";
import { getCustomerDashboardOrders } from "@/services/order.service";
import { CustomerDashboard } from "@/components/customer/CustomerDashboard";

export const metadata: Metadata = {
  title: "داشبورد مشتری | لانچ‌اوکس",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function DashboardPreviewPage() {
  const session = await requireUser();
  if (session.role === "admin") redirect("/admin");
  const [user, orders] = await Promise.all([
    getProfile(session.id),
    getCustomerDashboardOrders(session.id),
  ]);
  return <CustomerDashboard user={user} orders={orders} />;
}
