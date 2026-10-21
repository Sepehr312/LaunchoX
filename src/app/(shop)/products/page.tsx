import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductsCatalog } from "@/components/store/ProductsCatalog";
import { parseProductQuery, type StoreSearchParams } from "@/lib/product-query";
import { listCategories } from "@/services/category.service";
import {
  listProducts,
  getProductFilterOptions,
} from "@/services/product.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `محصولات | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<StoreSearchParams>;
}) {
  const values = await searchParams;
  const parsed = parseProductQuery(values);
  if (
    !parsed.success &&
    parsed.error.issues.some((issue) => issue.path[0] === "page")
  ) {
    notFound();
  }
  const query = parsed.success
    ? parsed.data
    : { page: 1, limit: 9, sort: "newest" as const };
  query.limit = values.limit ? query.limit : 9;
  const [categories, result, options] = await Promise.all([
    listCategories(),
    listProducts(query),
    getProductFilterOptions(),
  ]);
  if (query.page > Math.max(1, result.totalPages)) notFound();
  return (
    <ProductsCatalog
      result={result}
      categories={categories}
      options={options}
      query={query}
      error={parsed.success ? undefined : parsed.error.issues[0]?.message}
    />
  );
}
