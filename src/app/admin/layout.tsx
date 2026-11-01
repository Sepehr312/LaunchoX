import { requireAdmin } from "@/actions/auth.actions";
import { logoutAction } from "@/actions/auth.actions";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import Link from "next/link";
import { Snowflake, ArrowUpLeft, ShieldCheck, LogOut } from "lucide-react";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className={styles.scope}>
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <Link href="/admin" className="admin-logo">
            <Snowflake size={32} aria-hidden="true" />
            <span>
              <b dir="ltr">
                Launcho<span className="admin-logo-accent">X</span>
              </b>
              <small>مرکز مدیریت فروشگاه</small>
            </span>
          </Link>
          <AdminNavigation>
            <form action={logoutAction}>
              <button type="submit" className="admin-logout">
                <LogOut size={18} strokeWidth={1.5} aria-hidden="true" />
                خروج از حساب
              </button>
            </form>
          </AdminNavigation>
          <div className="admin-sidebar-footer">
            <p>
              <ShieldCheck size={18} aria-hidden="true" />
              پنل مدیریت
            </p>
            <Link href="/" className="admin-store-link">
              مشاهده فروشگاه <ArrowUpLeft size={18} aria-hidden="true" />
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="admin-logout">
                <LogOut size={18} strokeWidth={1.5} aria-hidden="true" />
                خروج از حساب
              </button>
            </form>
          </div>
        </aside>
        <main id="admin-content" className="min-w-0" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
