import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogPage } from "@/components/store/CatalogPage";
import { parseProductQuery, type StoreSearchParams } from "@/lib/product-query";
import { getCategoryBySlug, listCategories } from "@/services/category.service";
import { listProducts } from "@/services/product.service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const category = await getCategoryBySlug((await params).slug);
  if (!category) notFound();
  return {
    title: `${category.name} | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
    description: category.description,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<StoreSearchParams>;
}) {
  const [{ slug }, values] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  const parsed = parseProductQuery(values, { category: category.id });
  const [categories, result] = await Promise.all([
    listCategories(),
    listProducts(
      parsed.success
        ? parsed.data
        : { page: 1, limit: 12, sort: "newest", category: category.id },
    ),
  ]);
  return (
    <CatalogPage
      emptyTitle="محصولی در این دسته برای نمایش وجود ندارد"
      emptyMessage="این دسته محصولی مطابق انتخاب شما ندارد. فیلترها را تغییر دهید یا دسته‌های دیگر را ببینید."
      eyebrow="دسته‌بندی محصولات"
      title={category.name}
      description={
        category.description ??
        "مدل‌های این دسته را بر اساس قیمت و موجودی بررسی کنید."
      }
      result={result}
      categories={categories}
      searchParams={values}
      basePath={`/categories/${category.slug}`}
    />
  );
}
