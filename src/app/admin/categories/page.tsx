import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listCategoriesAdmin } from "@/services/category.service";
import { CategoryRowActions } from "@/components/admin/CategoryRowActions";
import { toPersianDigits } from "@/lib/format";
export const dynamic = "force-dynamic";
export const metadata = { title: "مدیریت دسته‌بندی‌ها | لانچ‌اوکس" };
export default async function Categories() {
  await requireAdmin();
  const categories = await listCategoriesAdmin();
  const names = new Map(categories.map((item) => [item.id, item.name]));
  return (
    <section className="admin-panel">
      <h1>مدیریت دسته‌بندی‌ها</h1>
      <Link href="/admin/categories/new">دسته‌بندی جدید</Link>
      {categories.length ? (
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr>
                {["نام", "والد", "ترتیب", "وضعیت", "عملیات"].map((label) => (
                  <th className="text-start" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((item) => (
                <tr key={item.id}>
                  <td className="break-words">{item.name}</td>
                  <td>
                    {item.parent
                      ? (names.get(item.parent) ?? "والد یافت نشد")
                      : "بدون والد"}
                  </td>
                  <td>{toPersianDigits(item.order)}</td>
                  <td>{item.isActive ? "فعال" : "غیرفعال"}</td>
                  <td>
                    <CategoryRowActions id={item.id} name={item.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>دسته‌بندی‌ای ثبت نشده است.</p>
      )}
    </section>
  );
}
