import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import { CatalogPage } from "@/components/store/CatalogPage";
import { parseProductQuery, type StoreSearchParams } from "@/lib/product-query";
import { listCategories } from "@/services/category.service";
import { listProducts } from "@/services/product.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `جستجو | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<StoreSearchParams>;
}) {
  const values = await searchParams;
  const parsed = parseProductQuery(values);
  const q = typeof values.q === "string" ? values.q : "";
  const [categories, result] = await Promise.all([
    listCategories(),
    listProducts(
      parsed.success ? parsed.data : { page: 1, limit: 12, sort: "newest", q },
    ),
  ]);
  return (
    <CatalogPage
      emptyTitle="نتیجه‌ای برای جستجو پیدا نشد"
      emptyMessage="عبارت جستجو یا فیلترها را تغییر دهید و دوباره جستجو کنید."
      eyebrow="جستجوی هوشمند"
      title={q ? `نتایج جستجو برای «${q}»` : "محصول موردنظرتان را پیدا کنید"}
      description="نام، برند یا ویژگی مورد نظر را جستجو و نتیجه را دقیق‌تر فیلتر کنید."
      result={result}
      categories={categories}
      searchParams={values}
      basePath="/search"
      includeSearch
    />
  );
}
