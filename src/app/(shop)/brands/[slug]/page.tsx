import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductsCatalog } from "@/components/store/ProductsCatalog";
import { parseProductQuery, type StoreSearchParams } from "@/lib/product-query";
import { getStoreBrandBySlug } from "@/services/brand.service";
import {
  getBrandCategories,
  getProductFilterOptions,
  listProducts,
  listBrandProducts,
} from "@/services/product.service";

export const dynamic = "force-dynamic";
const getBrand = cache(getStoreBrandBySlug);
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<StoreSearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const brand = await getBrand((await params).slug);
  return {
    title: brand ? `محصولات ${brand.name}` : "برند پیدا نشد",
    description: brand?.description,
  };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const brand = await getBrand((await params).slug);
  if (!brand) notFound();
  const values = await searchParams;
  const parsed = parseProductQuery({
    ...values,
    brandSlug: undefined,
    brands: undefined,
  });
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
  const [result, categories, options] = await Promise.all([
    listProducts(query, brand.id),
    getBrandCategories(brand.id),
    getProductFilterOptions(brand.id),
  ]);
  if (query.page > Math.max(1, result.totalPages)) notFound();
  const slug = brand.slug;
  async function loadProducts(next: Record<string, string | string[]>) {
    "use server";
    return listBrandProducts(slug, next);
  }
  return (
    <ProductsCatalog
      brand={brand}
      query={query}
      result={result}
      categories={categories}
      options={options}
      loadProducts={loadProducts}
      error={parsed.success ? undefined : parsed.error.issues[0]?.message}
    />
  );
}
