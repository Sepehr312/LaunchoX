import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { AdminListSearch } from "@/components/admin/AdminListSearch";
import { AdminTableScroll } from "@/components/admin/AdminTableScroll";
import { ProductRowActions } from "@/components/admin/ProductRowActions";
import { ProductActiveForm } from "@/components/admin/ProductActiveForm";
import { ProductPagination } from "@/components/admin/ProductPagination";
import { getEnv } from "@/lib/env";
import { requireAdmin } from "@/actions/auth.actions";
import { listProductsAdmin } from "@/services/product.service";
import { productQuerySchema } from "@/validations/product";
import { formatPrice, toPersianDigits } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `مدیریت محصولات | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};

export default async function ProductsAdmin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const parsed = productQuerySchema.safeParse({
    q: params.q,
    page: params.page,
  });
  if (!parsed.success)
    return (
      <section className="admin-panel">
        <h1>مدیریت محصولات</h1>
        <p role="alert">جستجو یا شمارهٔ صفحه معتبر نیست.</p>
        <Link href="/admin/products">بازگشت به محصولات</Link>
      </section>
    );
  const result = await listProductsAdmin(parsed.data);
  const first = result.items.length ? (result.page - 1) * result.limit + 1 : 0;
  const last = result.items.length ? first + result.items.length - 1 : 0;
  return (
    <div className="admin-products-page">
      <header className="admin-panel admin-page-header admin-approved-header">
        <div>
          <p className="admin-eyebrow">پنل مدیریت / محصولات</p>
          <h1>مدیریت محصولات</h1>
          <p className="admin-hint mt-2">
            فهرست محصولات، قیمت‌ها و موجودی فروشگاه
          </p>
        </div>
        <Link
          className="admin-primary admin-create-button"
          href="/admin/products/new"
          aria-label="محصول جدید"
          title="محصول جدید"
        >
          <Plus size={20} aria-hidden="true" />
          <span className="admin-create-label">محصول جدید</span>
        </Link>
      </header>
      <section
        className="admin-panel admin-product-list"
        aria-label="فهرست محصولات"
      >
        <AdminListSearch
          label="جستجوی محصول"
          placeholder="نام محصول را جستجو کنید…"
          query={parsed.data.q ?? ""}
        />
        <p className="admin-product-count">
          {toPersianDigits(result.total)} محصول
        </p>
        {!result.items.length ? (
          <p className="admin-empty">
            {parsed.data.q
              ? "محصولی با این عبارت جستجو پیدا نشد؛ عبارت دیگری را امتحان کنید."
              : "محصولی در این صفحه برای نمایش وجود ندارد. برای افزودن محصول، «محصول جدید» را انتخاب کنید."}
          </p>
        ) : (
          <AdminTableScroll label="جدول محصولات">
            <table className="admin-products-table">
              <thead>
                <tr>
                  {[
                    "تصویر",
                    "عنوان",
                    "برند",
                    "دسته",
                    "قیمت",
                    "موجودی",
                    "وضعیت",
                    "عملیات",
                  ].map((label) => (
                    <th scope="col" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.items.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <Image
                        src={product.images[0]}
                        alt={product.title}
                        width={60}
                        height={68}
                        unoptimized
                        className="admin-product-thumbnail"
                      />
                    </td>
                    <td>
                      <Link
                        className="admin-product-title"
                        href={`/admin/products/${product.id}/edit`}
                      >
                        {product.title}
                      </Link>
                    </td>
                    <td>
                      {product.attributes.find(
                        (attribute) => attribute.key === "برند",
                      )?.value || "بدون برند"}
                    </td>
                    <td>{product.category.name}</td>
                    <td className="admin-price-cell">
                      {formatPrice(product.price)}
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${product.stock === 0 ? "admin-badge-danger" : product.stock < 5 ? "admin-badge-warning" : "admin-badge-success"}`}
                      >
                        {product.stock === 0
                          ? "ناموجود"
                          : toPersianDigits(product.stock)}
                      </span>
                    </td>
                    <td>
                      <ProductActiveForm
                        id={product.id}
                        title={product.title}
                        isActive={product.isActive}
                      />
                    </td>
                    <td>
                      <ProductRowActions
                        id={product.id}
                        title={product.title}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableScroll>
        )}
        <footer className="admin-product-list-footer">
          <p>
            نمایش {toPersianDigits(first)} تا {toPersianDigits(last)} از{" "}
            {toPersianDigits(result.total)} محصول
          </p>
          <ProductPagination
            page={result.page}
            totalPages={result.totalPages}
            q={parsed.data.q}
          />
        </footer>
      </section>
    </div>
  );
}
