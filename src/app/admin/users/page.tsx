import { requireAdmin } from "@/lib/auth";
import { listUsersAdmin } from "@/services/admin-user.service";
import { UserActiveForm } from "@/components/admin/UserActiveForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "مدیریت کاربران | لانچ‌اوکس" };

export default async function Users() {
  const admin = await requireAdmin();
  const users = await listUsersAdmin();
  return (
    <section className="admin-panel">
      <h1>مدیریت کاربران</h1>
      {users.length ? (
        <table className="w-full table-fixed text-start text-sm">
          <thead>
            <tr>
              {["کاربر", "نقش", "وضعیت", "عملیات"].map((label) => (
                <th className="text-start" key={label}>
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
                <td className="p-1">{user.isActive ? "فعال" : "غیرفعال"}</td>
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
      ) : (
        <p>کاربری ثبت نشده است.</p>
      )}
    </section>
  );
}
