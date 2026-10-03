import type { Metadata } from "next";
import { CatalogPage } from "@/components/store/CatalogPage";
import { parseProductQuery, type StoreSearchParams } from "@/lib/product-query";
import { listCategories } from "@/services/category.service";
import { listProducts } from "@/services/product.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "محصولات | لانچ‌اوکس" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<StoreSearchParams>;
}) {
  const values = await searchParams;
  const parsed = parseProductQuery(values);
  const [categories, result] = await Promise.all([
    listCategories(),
    listProducts(
      parsed.success ? parsed.data : { page: 1, limit: 12, sort: "newest" },
    ),
  ]);
  return (
    <CatalogPage
      eyebrow="کاتالوگ تخصصی"
      title="یخچال و تجهیزات سرمایشی"
      description={
        parsed.success
          ? "فیلتر و مقایسهٔ مدل‌ها بر اساس نیاز واقعی شما"
          : (parsed.error.issues[0]?.message ?? "فیلترهای واردشده معتبر نیست")
      }
      result={result}
      categories={categories}
      searchParams={values}
      basePath="/products"
    />
  );
}
