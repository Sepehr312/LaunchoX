import type { MetadataRoute } from "next";
import { getEnv } from "@/lib/env";
import { listCategories } from "@/services/category.service";
import { listProducts } from "@/services/product.service";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getEnv().NEXT_PUBLIC_SITE_URL;
  const url = (path: string) => new URL(path, base).href;
  const entries: MetadataRoute.Sitemap = ["/", "/products", "/categories"].map(
    (path) => ({ url: url(path) }),
  );
  const categories = await listCategories();
  entries.push(
    ...categories.map((category) => ({
      url: url(`/categories/${encodeURIComponent(category.slug)}`),
    })),
  );
  let page = 1;
  let totalPages = 1;
  do {
    const result = await listProducts({ page, limit: 48, sort: "newest" });
    entries.push(
      ...result.items.map((product) => ({
        url: url(`/products/${encodeURIComponent(product.slug)}`),
      })),
    );
    totalPages = result.totalPages;
    page += 1;
  } while (page <= totalPages);
  return entries;
}
