import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import { Plus, Tags } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listBrands } from "@/services/brand.service";
import { BrandRowActions } from "@/components/admin/BrandRowActions";
import { toPersianDigits } from "@/lib/format";
export const dynamic = "force-dynamic";
export const metadata = { title: "مدیریت برندها | لانچ‌اوکس" };
const querySchema = z.object({
  q: z.string().trim().max(100).default(""),
  status: z.enum(["", "active", "inactive", "featured"]).default(""),
});
export default async function Brands({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const query = querySchema.safeParse(await searchParams);
  if (!query.success)
    return (
      <section className="admin-panel">
        <h1>مدیریت برندها</h1>
        <p role="alert">فیلتر یا عبارت جستجو معتبر نیست.</p>
        <Link href="/admin/brands">پاک‌کردن فیلترها</Link>
      </section>
    );
  const brands = await listBrands();
  const { q, status } = query.data;
  const filtered = brands.filter(
    (brand) =>
      (brand.name + " " + brand.slug)
        .toLocaleLowerCase("fa")
        .includes(q.toLocaleLowerCase("fa")) &&
      (status === "active"
        ? brand.isActive
        : status === "inactive"
          ? !brand.isActive
          : status === "featured"
            ? brand.isFeatured
            : true),
  );
  return (
    <section className="admin-panel">
      <header className="admin-page-header">
        <div>
          <p className="admin-eyebrow">کاتالوگ فروشگاه</p>
          <h1>مدیریت برندها</h1>
          <p className="admin-hint">هویت سازندگان، در یک جای مشخص</p>
        </div>
        <Link className="admin-primary" href="/admin/brands/new">
          <Plus size={20} aria-hidden="true" />
          برند جدید
        </Link>
      </header>
      <form className="admin-filter">
        <label>
          جستجوی برند
          <input
            name="q"
            className="field-input"
            placeholder="نام یا نامک برند…"
            defaultValue={q}
          />
        </label>
        <label>
          وضعیت
          <select name="status" className="field-input" defaultValue={status}>
            <option value="">همهٔ برندها</option>
            <option value="active">فعال</option>
            <option value="inactive">غیرفعال</option>
            <option value="featured">ویژه</option>
          </select>
        </label>
        <button className="admin-primary">اعمال فیلتر</button>
        <Link href="/admin/brands">پاک‌کردن</Link>
      </form>
      <p className="admin-hint">
        {toPersianDigits(filtered.length)} برند از{" "}
        {toPersianDigits(brands.length)} برند
      </p>
      {filtered.length ? (
        <div
          className="admin-table-scroll"
          role="region"
          aria-label="جدول برندها"
          tabIndex={0}
        >
          <table>
            <caption className="sr-only">برندهای فروشگاه</caption>
            <thead>
              <tr>
                {["برند", "کشور", "ترتیب", "وضعیت", "عملیات"].map((label) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((brand) => (
                <tr key={brand.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {brand.logo && (
                        <Image
                          src={brand.logo}
                          alt=""
                          width={36}
                          height={36}
                          unoptimized
                          className="h-9 w-9 object-contain"
                        />
                      )}
                      <strong>{brand.name}</strong>
                    </div>
                    <small className="admin-hint block">
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
        </div>
      ) : (
        <div className="admin-empty">
          <Tags size={36} aria-hidden="true" />
          <h2>
            {brands.length
              ? "برندی با این فیلتر پیدا نشد"
              : "اولین برند فروشگاه را بسازید"}
          </h2>
          <p>نام، لوگو و اطلاعات سازنده را اینجا مدیریت کنید.</p>
          <Link href={brands.length ? "/admin/brands" : "/admin/brands/new"}>
            {brands.length ? "پاک‌کردن فیلترها" : "افزودن برند"}
          </Link>
        </div>
      )}
    </section>
  );
}
