import { AdminTableScroll } from "@/components/admin/AdminTableScroll";
import { getEnv } from "@/lib/env";
import Link from "next/link";
import Image from "next/image";
import { requireAdmin } from "@/lib/auth";
import { listProductsAdmin } from "@/services/product.service";
import { productQuerySchema } from "@/validations/product";
import { Pagination } from "@/components/store/Pagination";
import { ProductRowActions } from "@/components/admin/ProductRowActions";
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
  return (
    <section className="admin-panel grid min-w-0 gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>مدیریت محصولات</h1>
        <Link className="admin-primary" href="/admin/products/new">
          محصول جدید
        </Link>
      </div>
      <form className="admin-filter">
        <label className="min-w-0 flex-1">
          جستجوی محصول
          <input
            className="field-input"
            name="q"
            defaultValue={parsed.data.q}
          />
        </label>
        <button>جستجو</button>
        <Link href="/admin/products">پاک کردن جستجو</Link>
      </form>
      <p>{toPersianDigits(result.total)} محصول</p>
      {!result.items.length ? (
        <p className="py-6 text-sm text-muted">
          {parsed.data.q
            ? "محصولی با این عبارت جستجو پیدا نشد؛ عبارت دیگری را امتحان کنید."
            : "محصولی در این صفحه برای نمایش وجود ندارد. برای افزودن محصول، «محصول جدید» را انتخاب کنید."}
        </p>
      ) : (
        <AdminTableScroll>
          <table className="w-full text-start">
            <thead>
              <tr>
                {[
                  "تصویر",
                  "عنوان",
                  "دسته",
                  "قیمت",
                  "موجودی",
                  "وضعیت",
                  "عملیات",
                ].map((label) => (
                  <th scope="col" className="p-3 text-start" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.items.map((product) => (
                <tr key={product.id}>
                  <td className="p-3">
                    <Image
                      src={product.images[0]}
                      alt={product.title}
                      width={64}
                      height={64}
                      unoptimized
                      className="max-w-none rounded object-cover"
                    />
                  </td>
                  <td className="p-3">{product.title}</td>
                  <td className="p-3">{product.category.name}</td>
                  <td className="p-3">{formatPrice(product.price)}</td>
                  <td className="p-3">{toPersianDigits(product.stock)}</td>
                  <td className="p-3">
                    {product.isActive ? "فعال" : "غیرفعال"}
                  </td>
                  <td className="p-3">
                    <ProductRowActions
                      id={product.id}
                      title={product.title}
                      isActive={product.isActive}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableScroll>
      )}
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/admin/products"
        searchParams={params}
      />
    </section>
  );
}
