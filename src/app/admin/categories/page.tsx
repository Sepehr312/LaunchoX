import Link from "next/link";
import Image from "next/image";
import { FolderTree } from "lucide-react";
import { getEnv } from "@/lib/env";
import { requireAdmin } from "@/actions/auth.actions";
import { AdminListHeader } from "@/components/admin/AdminListHeader";
import { AdminListSearch } from "@/components/admin/AdminListSearch";
import { AdminTableScroll } from "@/components/admin/AdminTableScroll";
import { CategoryRowActions } from "@/components/admin/CategoryRowActions";
import { AdminCatalogView } from "@/components/admin/AdminCatalogView";
import { CategoryCards } from "@/components/admin/CategoryCards";
import { listCategoriesAdmin } from "@/services/category.service";
import { adminListQuerySchema } from "@/validations/admin-list";
import { toPersianDigits } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `مدیریت دسته‌بندی‌ها | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};

export default async function Categories({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const query = adminListQuerySchema.safeParse(await searchParams);
  if (!query.success)
    return (
      <section className="admin-panel">
        <h1>مدیریت دسته‌بندی‌ها</h1>
        <p role="alert">عبارت جستجو معتبر نیست.</p>
        <Link href="/admin/categories">بازگشت به دسته‌بندی‌ها</Link>
      </section>
    );
  const categories = await listCategoriesAdmin();
  const names = new Map(categories.map((item) => [item.id, item.name]));
  const filtered = categories.filter((item) =>
    `${item.name} ${item.slug}`
      .toLocaleLowerCase("fa")
      .includes(query.data.q.toLocaleLowerCase("fa")),
  );
  return (
    <div className="admin-list-page">
      <AdminListHeader
        title="مدیریت دسته‌بندی‌ها"
        section="دسته‌بندی‌ها"
        description="فهرست دسته‌ها، گروه‌بندی محصولات و ترتیب نمایش"
        create={{ href: "/admin/categories/new", label: "دسته‌بندی جدید" }}
      />
      <section
        className="admin-panel admin-list-panel"
        aria-label="فهرست دسته‌بندی‌ها"
      >
        <AdminListSearch
          label="جستجوی دسته‌بندی"
          placeholder="نام یا نامک دسته‌بندی را جستجو کنید…"
          query={query.data.q}
        />
        <AdminCatalogView
          entity="categories"
          count={`${toPersianDigits(filtered.length)} دسته‌بندی`}
          hasItems={filtered.length > 0}
          cards={
            <CategoryCards
              categories={filtered.map((item) => ({
                ...item,
                parentName: item.parent
                  ? (names.get(item.parent) ?? "والد یافت نشد")
                  : "بدون والد",
              }))}
            />
          }
          table={
            <AdminTableScroll label="جدول دسته‌بندی‌ها">
              <table className="admin-list-table">
                <caption className="sr-only">دسته‌بندی‌های فروشگاه</caption>
                <thead>
                  <tr>
                    {["تصویر", "نام", "والد", "ترتیب", "وضعیت", "عملیات"].map(
                      (label) => (
                        <th scope="col" key={label}>
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt=""
                            width={60}
                            height={68}
                            unoptimized
                            className="admin-product-thumbnail"
                          />
                        ) : (
                          <span className="admin-list-placeholder">
                            <FolderTree size={24} aria-hidden="true" />
                          </span>
                        )}
                      </td>
                      <td>
                        <Link
                          className="admin-list-title"
                          href={`/admin/categories/${item.id}/edit`}
                        >
                          {item.name}
                        </Link>
                        <small className="admin-list-secondary">
                          <bdi>{item.slug}</bdi>
                        </small>
                      </td>
                      <td>
                        {item.parent
                          ? (names.get(item.parent) ?? "والد یافت نشد")
                          : "بدون والد"}
                      </td>
                      <td>{toPersianDigits(item.order)}</td>
                      <td>
                        <span
                          className={
                            item.isActive
                              ? "admin-badge admin-badge-success"
                              : "admin-badge"
                          }
                        >
                          {item.isActive ? "فعال" : "غیرفعال"}
                        </span>
                      </td>
                      <td>
                        <CategoryRowActions id={item.id} name={item.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableScroll>
          }
          empty={
            <div className="admin-empty">
              <FolderTree size={36} aria-hidden="true" />
              <p>
                {categories.length
                  ? "دسته‌بندی‌ای با این عبارت جستجو پیدا نشد."
                  : "دسته‌بندی‌ای ثبت نشده است."}
              </p>
              {!categories.length && (
                <Link href="/admin/categories/new">افزودن دسته‌بندی</Link>
              )}
            </div>
          }
        />
        <footer className="admin-list-footer">
          <p>
            نمایش {toPersianDigits(filtered.length)} از{" "}
            {toPersianDigits(categories.length)} دسته‌بندی
          </p>
        </footer>
      </section>
    </div>
  );
}
