import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoreSearchParams } from "@/lib/product-query";

vi.mock("server-only", () => ({}));
const { products } = vi.hoisted(() => ({ products: vi.fn() }));
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
  listCategories: async () => [],
  getCategoryBySlug: async () => ({
    id: "507f1f77bcf86cd799439011",
    slug: "fridges",
  }),
}));
vi.mock("@/services/brand.service", () => ({
  getStoreBrandBySlug: async () => ({
    id: "507f1f77bcf86cd799439012",
    slug: "samsung",
  }),
}));
vi.mock("@/services/product.service", () => ({
  listProducts: products,
  listBrandProducts: vi.fn(),
  getBrandCategories: async () => [],
  getProductFilterOptions: async () => ({
    brands: [],
    energies: [],
    maxPrice: 0,
  }),
}));

import ProductsPage from "@/app/(shop)/products/page";
import CategoryPage from "@/app/(shop)/categories/[slug]/page";
import BrandPage from "@/app/(shop)/brands/[slug]/page";

beforeEach(() => {
  vi.clearAllMocks();
  products.mockImplementation(async (query) => ({
    items: [],
    total: 30,
    totalPages: 4,
    page: query.page,
    limit: query.limit,
  }));
});

const routes = [
  {
    name: "products",
    render: (values: StoreSearchParams) =>
      ProductsPage({ searchParams: Promise.resolve(values) }),
  },
  {
    name: "category",
    render: (values: StoreSearchParams) =>
      CategoryPage({
        params: Promise.resolve({ slug: "fridges" }),
        searchParams: Promise.resolve(values),
      }),
  },
  {
    name: "brand",
    render: (values: StoreSearchParams) =>
      BrandPage({
        params: Promise.resolve({ slug: "samsung" }),
        searchParams: Promise.resolve(values),
      }),
  },
];

describe.each(routes)("$name pagination", ({ name, render }) => {
  it.each(["2", "۲", "٢"])(
    "passes URL page %s with combined filters and sorting",
    async (page) => {
      const view = await render({
        page,
        limit: "3",
        minPrice: "1000",
        maxPrice: "5000",
        inStock: "true",
        energies: ["A+", "B"],
        sort: "price_desc",
        category: "507f1f77bcf86cd799439013",
        brands: ["سامسونگ"],
      });
      expect(view.props.query).toMatchObject({
        page: 2,
        limit: 3,
        minPrice: 1000,
        maxPrice: 5000,
        inStock: true,
        energies: ["A+", "B"],
        sort: "price_desc",
        category:
          name === "category"
            ? "507f1f77bcf86cd799439011"
            : "507f1f77bcf86cd799439013",
      });
      if (name === "brand") {
        expect(view.props.query.brands).toBeUndefined();
        expect(products).toHaveBeenCalledWith(
          view.props.query,
          "507f1f77bcf86cd799439012",
        );
      } else {
        expect(view.props.query.brands).toEqual(["سامسونگ"]);
        expect(products).toHaveBeenCalledWith(view.props.query);
      }
      expect(view.props.result.page).toBe(2);
    },
  );

  it.each([
    "0",
    "-1",
    "1.5",
    "abc",
    "",
    "Infinity",
    "9007199254740992",
    ["1", "2"],
  ])("rejects invalid page %j before querying products", async (page) => {
    await expect(render({ page })).rejects.toThrow("NOT_FOUND");
    expect(products).not.toHaveBeenCalled();
  });

  it("rejects pages beyond the filtered range", async () => {
    await expect(render({ page: "5", inStock: "true" })).rejects.toThrow(
      "NOT_FOUND",
    );
  });

  it("allows the last page", async () => {
    expect((await render({ page: "4" })).props.query.page).toBe(4);
  });

  it("keeps an empty first page and rejects later empty pages", async () => {
    products.mockResolvedValue({
      items: [],
      total: 0,
      totalPages: 0,
      page: 1,
      limit: 9,
    });
    const view = await render({ inStock: "true" });
    expect(view.props.query).toMatchObject({
      page: 1,
      limit: 9,
      inStock: true,
    });
    expect(view.props.result.total).toBe(0);
    await expect(render({ page: "2", inStock: "true" })).rejects.toThrow(
      "NOT_FOUND",
    );
  });
});
