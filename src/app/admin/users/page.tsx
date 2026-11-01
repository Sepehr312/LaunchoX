import Link from "next/link";
import { Users as UsersIcon, UserRound } from "lucide-react";
import { getEnv } from "@/lib/env";
import { requireAdmin } from "@/actions/auth.actions";
import { AdminListHeader } from "@/components/admin/AdminListHeader";
import { AdminListSearch } from "@/components/admin/AdminListSearch";
import { AdminTableScroll } from "@/components/admin/AdminTableScroll";
import { UserActiveForm } from "@/components/admin/UserActiveForm";
import { UserRoleForm } from "@/components/admin/UserRoleForm";
import {
  listUsersAdmin,
  getUserManagementPermissions,
} from "@/services/admin-user.service";
import { adminListQuerySchema } from "@/validations/admin-list";
import { toPersianDigits } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `مدیریت کاربران | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};

export default async function Users({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const query = adminListQuerySchema.safeParse(await searchParams);
  if (!query.success)
    return (
      <section className="admin-panel">
        <h1>مدیریت کاربران</h1>
        <p role="alert">عبارت جستجو معتبر نیست.</p>
        <Link href="/admin/users">بازگشت به کاربران</Link>
      </section>
    );
  const users = await listUsersAdmin();
  const permissions = await getUserManagementPermissions();
  const filtered = users.filter((user) =>
    `${user.name} ${user.email}`
      .toLocaleLowerCase("fa")
      .includes(query.data.q.toLocaleLowerCase("fa")),
  );
  return (
    <div className="admin-list-page">
      <AdminListHeader
        title="مدیریت کاربران"
        section="کاربران"
        description="فهرست کاربران، نقش‌ها و وضعیت دسترسی به فروشگاه"
      />
      <section
        className="admin-panel admin-list-panel"
        aria-label="فهرست کاربران"
      >
        <AdminListSearch
          label="جستجوی کاربر"
          placeholder="نام یا ایمیل کاربر را جستجو کنید…"
          query={query.data.q}
        />
        <p className="admin-list-count">
          {toPersianDigits(filtered.length)} کاربر
        </p>
        {filtered.length ? (
          <AdminTableScroll label="جدول کاربران">
            <table className="admin-list-table admin-users-table">
              <caption className="sr-only">حساب‌های کاربران فروشگاه</caption>
              <thead>
                <tr>
                  {["کاربر", "ایمیل", "نقش", "وضعیت"].map((label) => (
                    <th scope="col" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-list-user">
                        <span className="admin-user-avatar">
                          <UserRound size={22} aria-hidden="true" />
                        </span>
                        <strong>{user.name}</strong>
                      </div>
                    </td>
                    <td>
                      <bdi className="admin-user-email">{user.email}</bdi>
                    </td>
                    <td>
                      {user.id === permissions.ownerId ? (
                        <span>ادمین</span>
                      ) : (
                        <UserRoleForm
                          id={user.id}
                          name={user.name}
                          role={user.role}
                          canManage={permissions.canManageAdmins}
                          isSelf={user.id === admin.id}
                        />
                      )}
                    </td>
                    <td>
                      {user.id === permissions.ownerId ? (
                        <span>{user.isActive ? "فعال" : "غیرفعال"}</span>
                      ) : (
                        <UserActiveForm
                          id={user.id}
                          name={user.name}
                          isActive={user.isActive}
                          requiresConfirmation={user.role === "admin"}
                          canManage={
                            user.role !== "admin" || permissions.canManageAdmins
                          }
                          isSelf={user.id === admin.id}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableScroll>
        ) : (
          <div className="admin-empty">
            <UsersIcon size={36} aria-hidden="true" />
            <p>
              {users.length
                ? "کاربری با این عبارت جستجو پیدا نشد."
                : "کاربری ثبت نشده است."}
            </p>
          </div>
        )}
        <footer className="admin-list-footer">
          <p>
            نمایش {toPersianDigits(filtered.length)} از{" "}
            {toPersianDigits(users.length)} کاربر
          </p>
        </footer>
      </section>
    </div>
  );
}
