import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  brand: vi.fn(),
  products: vi.fn(),
  load: vi.fn(),
  categories: vi.fn(),
  options: vi.fn(),
}));
vi.mock("@/services/brand.service", () => ({
  getStoreBrandBySlug: mocks.brand,
}));
vi.mock("@/services/product.service", () => ({
  listProducts: mocks.products,
  listBrandProducts: mocks.load,
  getBrandCategories: mocks.categories,
  getProductFilterOptions: mocks.options,
}));
vi.mock("@/actions/cart.actions", () => ({ addCartAction: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
import BrandPage, { generateMetadata } from "@/app/(shop)/brands/[slug]/page";
import { ProductsCatalog } from "@/components/store/ProductsCatalog";
import { BrandAbout, BrandHero } from "@/components/store/BrandDetail";

const brand = {
  id: "507f1f77bcf86cd799439011",
  name: "سامسونگ",
  slug: "samsung",
  logo: "/samsung.svg",
  description: "توضیحات واقعی",
  productCount: 2,
};
const result = { items: [], total: 0, totalPages: 0, page: 1, limit: 9 };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.brand.mockResolvedValue(brand);
  mocks.products.mockResolvedValue(result);
  mocks.categories.mockResolvedValue([]);
  mocks.options.mockResolvedValue({ brands: [], energies: [], maxPrice: 0 });
});

it("shares the original catalog, scopes initial queries and captures the route slug for subsequent loads", async () => {
  const page = await BrandPage({
    params: Promise.resolve({ slug: "samsung" }),
    searchParams: Promise.resolve({
      brandSlug: "lg",
      brands: "ال‌جی",
      sort: "price_desc",
      inStock: "true",
    }),
  });
  expect(page.type).toBe(ProductsCatalog);
  expect(mocks.products).toHaveBeenCalledWith(
    expect.objectContaining({
      sort: "price_desc",
      inStock: true,
      page: 1,
      limit: 9,
      brands: undefined,
      brandSlug: undefined,
    }),
    brand.id,
  );
  expect(mocks.options).toHaveBeenCalledWith(brand.id);
  expect(mocks.categories).toHaveBeenCalledWith(brand.id);
  await page.props.loadProducts({ brandSlug: "lg", page: "2" });
  expect(mocks.load).toHaveBeenCalledWith("samsung", {
    brandSlug: "lg",
    page: "2",
  });
});

it("falls back safely for invalid filters, returns 404 for unavailable brands and uses production metadata", async () => {
  const page = await BrandPage({
    params: Promise.resolve({ slug: "samsung" }),
    searchParams: Promise.resolve({ minPrice: "bad" }),
  });
  expect(page.props.error).toBeTruthy();
  expect(mocks.products).toHaveBeenCalledWith(
    { page: 1, limit: 9, sort: "newest" },
    brand.id,
  );
  expect(
    await generateMetadata({
      params: Promise.resolve({ slug: "samsung" }),
      searchParams: Promise.resolve({}),
    }),
  ).toMatchObject({
    title: "محصولات سامسونگ",
    description: brand.description,
  });
  mocks.brand.mockResolvedValue(null);
  await expect(
    BrandPage({
      params: Promise.resolve({ slug: "missing" }),
      searchParams: Promise.resolve({}),
    }),
  ).rejects.toThrow("NOT_FOUND");
});

it("renders the real hero, accessible logo, empty state, shared controls and hides only the brand filter", () => {
  const props = {
    categories: [],
    options: { brands: ["سامسونگ"], energies: ["A+"], maxPrice: 100 },
    result,
    query: { page: 1, limit: 9, sort: "newest" as const },
  };
  const scoped = renderToStaticMarkup(
    <ProductsCatalog {...props} brand={brand} />,
  );
  expect(scoped).toContain("لوگوی سامسونگ");
  expect(scoped).toContain("۲ محصول");
  expect(scoped).toContain("توضیحات واقعی");
  expect(scoped).toContain("محصولی با این مشخصات پیدا نشد");
  expect(scoped).toContain("مرتب‌سازی محصولات");
  expect(scoped).toContain('data-theme="light"');
  expect(scoped).not.toContain('<legend class="sr-only">برند</legend>');
  const normal = renderToStaticMarkup(<ProductsCatalog {...props} />);
  expect(normal).toContain('<legend class="sr-only">برند</legend>');
  expect(normal).toContain("یخچال و فریزر");
  expect(
    renderToStaticMarkup(
      <BrandAbout brand={{ ...brand, description: undefined }} />,
    ),
  ).toBe("");
  expect(
    renderToStaticMarkup(
      <BrandAbout brand={{ ...brand, description: "توضیح ".repeat(100) }} />,
    ),
  ).toContain("مشاهده بیشتر");
  expect(
    renderToStaticMarkup(<BrandHero brand={{ ...brand, logo: undefined }} />),
  ).not.toContain("<img");
});
