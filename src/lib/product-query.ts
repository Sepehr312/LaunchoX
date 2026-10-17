import { productQuerySchema } from "@/validations/product";

export type StoreSearchParams = Record<string, string | string[] | undefined>;

export function parseProductQuery(
  searchParams: StoreSearchParams,
  overrides: { category?: string; q?: string } = {},
) {
  const stringValue = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" && value !== "" ? value : undefined;
  };
  const listValue = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" ? [value] : value;
  };
  return productQuerySchema.safeParse({
    page: stringValue("page"),
    limit: stringValue("limit"),
    category: overrides.category ?? stringValue("category"),
    brandSlug: stringValue("brandSlug"),
    q: overrides.q ?? stringValue("q"),
    minPrice: stringValue("minPrice"),
    maxPrice: stringValue("maxPrice"),
    sort: stringValue("sort"),
    inStock: stringValue("inStock"),
    brands: listValue("brands"),
    energies: listValue("energies"),
    capacity: stringValue("capacity"),
    discounted: stringValue("discounted"),
  });
}
