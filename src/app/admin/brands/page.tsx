import Link from "next/link";
import Image from "next/image";
import { Tags } from "lucide-react";
import { requireAdmin } from "@/actions/auth.actions";
import { AdminListHeader } from "@/components/admin/AdminListHeader";
import { AdminListSearch } from "@/components/admin/AdminListSearch";
import { AdminTableScroll } from "@/components/admin/AdminTableScroll";
import { BrandRowActions } from "@/components/admin/BrandRowActions";
import { listBrands } from "@/services/brand.service";
import { adminListQuerySchema } from "@/validations/admin-list";
import { toPersianDigits } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "مدیریت برندها | لانچ‌اوکس" };

export default async function Brands({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const query = adminListQuerySchema.safeParse(await searchParams);
  if (!query.success)
    return (
      <section className="admin-panel">
        <h1>مدیریت برندها</h1>
        <p role="alert">عبارت جستجو معتبر نیست.</p>
        <Link href="/admin/brands">بازگشت به برندها</Link>
      </section>
    );
  const brands = await listBrands();
  const { q } = query.data;
  const filtered = brands.filter((brand) =>
    (brand.name + " " + brand.slug)
      .toLocaleLowerCase("fa")
      .includes(q.toLocaleLowerCase("fa")),
  );
  return (
    <div className="admin-list-page">
      <AdminListHeader
        title="مدیریت برندها"
        section="برندها"
        description="فهرست برندها، اطلاعات سازندگان و وضعیت نمایش"
        create={{ href: "/admin/brands/new", label: "برند جدید" }}
      />
      <section
        className="admin-panel admin-list-panel"
        aria-label="فهرست برندها"
      >
        <AdminListSearch
          label="جستجوی برند"
          placeholder="نام یا نامک برند را جستجو کنید…"
          query={q}
        />
        <p className="admin-list-count">
          {toPersianDigits(filtered.length)} برند از{" "}
          {toPersianDigits(brands.length)} برند
        </p>
        {filtered.length ? (
          <AdminTableScroll label="جدول برندها">
            <table className="admin-list-table">
              <caption className="sr-only">برندهای فروشگاه</caption>
              <thead>
                <tr>
                  {["تصویر", "برند", "کشور", "ترتیب", "وضعیت", "عملیات"].map(
                    (label) => (
                      <th scope="col" key={label}>
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((brand) => (
                  <tr key={brand.id}>
                    <td>
                      {brand.logo ? (
                        <Image
                          src={brand.logo}
                          alt=""
                          width={60}
                          height={68}
                          unoptimized
                          className="admin-product-thumbnail"
                        />
                      ) : (
                        <span className="admin-list-placeholder">
                          <Tags size={24} aria-hidden="true" />
                        </span>
                      )}
                    </td>
                    <td>
                      <Link
                        className="admin-list-title"
                        href={`/admin/brands/${brand.id}/edit`}
                      >
                        {brand.name}
                      </Link>
                      <small className="admin-list-secondary">
                        <bdi>{brand.slug}</bdi>
                      </small>
                    </td>
                    <td>{brand.country || "ثبت نشده"}</td>
                    <td>{toPersianDigits(brand.order)}</td>
                    <td>
                      <span
                        className={
                          brand.isActive
                            ? "admin-badge admin-badge-success"
                            : "admin-badge"
                        }
                      >
                        {brand.isActive ? "فعال" : "غیرفعال"}
                      </span>
                      {brand.isFeatured && (
                        <span className="admin-badge admin-badge-warning">
                          ویژه
                        </span>
                      )}
                    </td>
                    <td>
                      <BrandRowActions id={brand.id} name={brand.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableScroll>
        ) : (
          <div className="admin-empty">
            <Tags size={36} aria-hidden="true" />
            <h2>
              {brands.length
                ? "برندی با این عبارت جستجو پیدا نشد"
                : "اولین برند فروشگاه را بسازید"}
            </h2>
            <p>نام، لوگو و اطلاعات سازنده را اینجا مدیریت کنید.</p>
            {!brands.length && (
              <Link href="/admin/brands/new">افزودن برند</Link>
            )}
          </div>
        )}
        <footer className="admin-list-footer">
          <p>
            نمایش {toPersianDigits(filtered.length)} از{" "}
            {toPersianDigits(brands.length)} برند
          </p>
        </footer>
      </section>
    </div>
  );
}
