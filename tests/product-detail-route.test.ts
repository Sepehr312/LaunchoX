import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  product: vi.fn(),
  related: vi.fn(),
  cart: vi.fn(),
}));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ NEXT_PUBLIC_SITE_NAME: "فروشگاه" }),
}));
vi.mock("@/services/product.service", () => ({
  getProductBySlug: mocks.product,
  getRelatedProducts: mocks.related,
  listProducts: vi.fn(),
}));
vi.mock("@/actions/cart.actions", () => ({ getCurrentCart: mocks.cart }));
vi.mock("@/components/store/ProductDetails", () => ({
  ProductDetails: () => null,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

import ProductPage, {
  generateMetadata,
} from "@/app/(shop)/products/[slug]/page";

const product = {
  id: "507f1f77bcf86cd799439011",
  title: "یخچال جدید",
  slug: "یخچال-جدید",
  description: "توضیحات محصول جدید",
  category: { id: "507f1f77bcf86cd799439012" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.product.mockResolvedValue(product);
  mocks.related.mockResolvedValue([]);
  mocks.cart.mockResolvedValue({ items: [] });
});

it.each(["یخچال-جدید", encodeURIComponent("یخچال-جدید"), "fridge-123"])(
  "loads product details and metadata from route slug %s",
  async (slug) => {
    const params = Promise.resolve({ slug });
    const page = await ProductPage({ params });
    const metadata = await generateMetadata({ params });
    expect(mocks.product).toHaveBeenCalledWith(decodeURIComponent(slug));
    expect(page.props.product).toBe(product);
    expect(metadata.title).toContain(product.title);
  },
);

it.each(["%E0%A4%A", "%2Fadmin", "%252Fadmin", "invalid_slug"])(
  "rejects malformed or unsafe route slug %s before querying products",
  async (slug) => {
    const params = Promise.resolve({ slug });
    await expect(ProductPage({ params })).rejects.toThrow("NOT_FOUND");
    await expect(generateMetadata({ params })).rejects.toThrow("NOT_FOUND");
    expect(mocks.product).not.toHaveBeenCalled();
  },
);

it.each(["missing", "deleted", "inactive"])(
  "uses notFound for %s products in both rendering and metadata",
  async () => {
    mocks.product.mockResolvedValue(null);
    const params = Promise.resolve({ slug: product.slug });
    await expect(ProductPage({ params })).rejects.toThrow("NOT_FOUND");
    await expect(generateMetadata({ params })).rejects.toThrow("NOT_FOUND");
    expect(mocks.cart).not.toHaveBeenCalled();
    expect(mocks.related).not.toHaveBeenCalled();
  },
);

it("propagates database outages without treating the product as missing", async () => {
  const failure = new Error("Database unavailable");
  mocks.product.mockRejectedValue(failure);
  const params = Promise.resolve({ slug: product.slug });
  await expect(ProductPage({ params })).rejects.toBe(failure);
  await expect(generateMetadata({ params })).rejects.toBe(failure);
  expect(mocks.cart).not.toHaveBeenCalled();
  expect(mocks.related).not.toHaveBeenCalled();

  mocks.product.mockResolvedValue(product);
  expect((await ProductPage({ params })).props.product).toBe(product);
});

it.each(["related", "cart"] as const)(
  "propagates %s failures to the retry boundary",
  async (source) => {
    const failure = new Error("Database unavailable");
    mocks[source].mockRejectedValue(failure);
    await expect(
      ProductPage({ params: Promise.resolve({ slug: product.slug }) }),
    ).rejects.toBe(failure);
  },
);
