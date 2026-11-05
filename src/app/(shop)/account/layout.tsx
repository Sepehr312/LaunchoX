import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
import { redirect } from "next/navigation";
import { requireUser } from "@/actions/auth.actions";
import { getProfile } from "@/services/user.service";
import { CustomerScope } from "@/components/customer/CustomerScope";
import { DashboardNavigation } from "@/components/customer/DashboardNavigation";
import { DashboardBreadcrumb } from "@/components/customer/DashboardBreadcrumb";
import styles from "@/components/customer/dashboard.module.css";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();
  if (session.role === "admin") redirect("/admin");
  const user = await getProfile(session.id);
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <DashboardBreadcrumb />
        <CustomerScope>
          <main className={styles.layout}>
            <DashboardNavigation name={user.name} />
            <div className="min-w-0">{children}</div>
          </main>
        </CustomerScope>
      </div>
    </div>
  );
}
