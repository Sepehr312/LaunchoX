import { getEnv } from "@/lib/env";
import { requireAdmin } from "@/lib/auth";
import { listUsersAdmin } from "@/services/admin-user.service";
import { UserActiveForm } from "@/components/admin/UserActiveForm";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `مدیریت کاربران | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};

export default async function Users() {
  const admin = await requireAdmin();
  const users = await listUsersAdmin();
  return (
    <section className="admin-panel">
      <p className="admin-eyebrow">مشتریان و دسترسی‌ها</p>
      <h1>مدیریت کاربران</h1>
      <p className="admin-hint">
        اطلاعات حساب‌ها و وضعیت دسترسی کاربران فروشگاه
      </p>
      {users.length ? (
        <div
          className="admin-table-scroll"
          role="region"
          aria-label="جدول کاربران"
          tabIndex={0}
        >
          <table>
            <caption className="sr-only">حساب‌های کاربران فروشگاه</caption>
            <thead>
              <tr>
                {["کاربر", "نقش", "وضعیت", "عملیات"].map((label) => (
                  <th scope="col" className="text-start" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="p-1 [overflow-wrap:anywhere]">
                    {user.name}
                    <span className="block" dir="ltr">
                      {user.email}
                    </span>
                  </td>
                  <td className="p-1">
                    {user.role === "admin" ? "ادمین" : "مشتری"}
                  </td>
                  <td>
                    <span
                      className={
                        user.isActive
                          ? "admin-badge admin-badge-success"
                          : "admin-badge"
                      }
                    >
                      {user.isActive ? "فعال" : "غیرفعال"}
                    </span>
                  </td>
                  <td className="p-1 [overflow-wrap:anywhere]">
                    <UserActiveForm
                      id={user.id}
                      name={user.name}
                      isActive={user.isActive}
                      isSelf={user.id === admin.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>کاربری ثبت نشده است.</p>
      )}
    </section>
  );
}
