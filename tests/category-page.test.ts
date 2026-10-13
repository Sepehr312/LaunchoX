import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { products, category, options } = vi.hoisted(() => ({
  products: vi.fn(),
  category: vi.fn(),
  options: vi.fn(),
}));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ NEXT_PUBLIC_SITE_NAME: "لانچ‌اوکس" }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/components/store/ProductsCatalog", () => ({
  ProductsCatalog: () => null,
}));
vi.mock("@/services/category.service", () => ({
  getCategoryBySlug: category,
  listCategories: async () => [],
}));
vi.mock("@/services/product.service", () => ({
  listProducts: products,
  getProductFilterOptions: options,
}));

import CategoryPage from "@/app/(shop)/categories/[slug]/page";

const selectedCategory = {
  id: "507f1f77bcf86cd799439011",
  slug: "twin",
  name: "یخچال دوقلو",
};
beforeEach(() => {
  vi.clearAllMocks();
  category.mockResolvedValue(selectedCategory);
  products.mockResolvedValue({ items: [], total: 0 });
  options.mockResolvedValue({ brands: [], energies: [], maxPrice: 0 });
});

it("uses the shared catalog and enforces route category while forwarding filters", async () => {
  const page = await CategoryPage({
    params: Promise.resolve({ slug: "twin" }),
    searchParams: Promise.resolve({
      category: "507f1f77bcf86cd799439012",
      brands: ["نوردیک"],
      inStock: "true",
      sort: "price_asc",
    }),
  });
  expect(products).toHaveBeenCalledWith(
    expect.objectContaining({
      category: selectedCategory.id,
      brands: ["نوردیک"],
      inStock: true,
      sort: "price_asc",
      limit: 9,
    }),
  );
  expect(page.props.selectedCategory).toEqual(selectedCategory);
  expect(options).toHaveBeenCalledOnce();
});

it("keeps the category scoped when invalid filters fall back", async () => {
  await CategoryPage({
    params: Promise.resolve({ slug: "twin" }),
    searchParams: Promise.resolve({ minPrice: "invalid" }),
  });
  expect(products).toHaveBeenCalledWith({
    category: selectedCategory.id,
    page: 1,
    limit: 9,
    sort: "newest",
  });
});

it("rejects invalid and missing category slugs", async () => {
  await expect(
    CategoryPage({
      params: Promise.resolve({ slug: "../bad" }),
      searchParams: Promise.resolve({}),
    }),
  ).rejects.toThrow("NOT_FOUND");
  expect(category).not.toHaveBeenCalled();
  category.mockResolvedValue(null);
  await expect(
    CategoryPage({
      params: Promise.resolve({ slug: "missing" }),
      searchParams: Promise.resolve({}),
    }),
  ).rejects.toThrow("NOT_FOUND");
});
