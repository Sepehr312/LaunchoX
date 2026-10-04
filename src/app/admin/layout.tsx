import { requireAdmin } from "@/actions/auth.actions";
import { logoutAction } from "@/actions/auth.actions";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="text-xl font-black">
          لانچ‌اوکس
          <span className="mt-2 block text-xs font-normal text-muted">
            مرکز مدیریت فروشگاه
          </span>
        </Link>
        <AdminNavigation />
        <div className="flex flex-wrap items-center gap-4 lg:mt-auto">
          <Link href="/" className="text-sm text-primary">
            مشاهده فروشگاه
          </Link>
          <form action={logoutAction}>
            <Button type="submit">خروج</Button>
          </form>
        </div>
      </aside>
      <main id="admin-content" className="min-w-0">
        {children}
      </main>
    </div>
  );
}
