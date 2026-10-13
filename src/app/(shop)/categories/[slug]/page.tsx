import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductsCatalog } from "@/components/store/ProductsCatalog";
import { slugSchema } from "@/validations/common";
import { parseProductQuery, type StoreSearchParams } from "@/lib/product-query";
import { getCategoryBySlug, listCategories } from "@/services/category.service";
import {
  getProductFilterOptions,
  listProducts,
} from "@/services/product.service";

export const dynamic = "force-dynamic";

async function resolveCategory(slug: string) {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) notFound();
  const category = await getCategoryBySlug(parsed.data);
  if (!category) notFound();
  return category;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const category = await resolveCategory((await params).slug);
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
  const category = await resolveCategory(slug);
  const parsed = parseProductQuery(values, { category: category.id });
  const query = parsed.success
    ? parsed.data
    : { page: 1, limit: 9, sort: "newest" as const, category: category.id };
  query.limit = values.limit ? query.limit : 9;
  query.page = 1;
  const [categories, result, options] = await Promise.all([
    listCategories(),
    listProducts(query),
    getProductFilterOptions(),
  ]);
  return (
    <ProductsCatalog
      key={category.id}
      selectedCategory={category}
      result={result}
      categories={categories}
      options={options}
      query={query}
      error={parsed.success ? undefined : parsed.error.issues[0]?.message}
    />
  );
}
