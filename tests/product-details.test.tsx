import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ProductDetails } from "@/components/store/ProductDetails";
import { formatPrice } from "@/lib/format";
import { getProductPricing } from "@/lib/product-pricing";

vi.mock("server-only", () => ({}));

import type { StoreProductDTO } from "@/types/dto";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/actions/cart.actions", () => ({
  addCartAction: vi.fn(),
  updateCartAction: vi.fn(),
  removeCartAction: vi.fn(),
}));

const timestamp = "2026-10-13T00:00:00.000Z";
const product: StoreProductDTO = {
  id: "507f1f77bcf86cd799439011",
  title: "یخچال ثبت‌شده",
  slug: "registered-fridge",
  description: "توضیحات ثبت‌شده برای محصول فروشگاه",
  price: 35400000,
  pricing: getProductPricing({ price: 35400000, compareAtPrice: 36900000 }),
  compareAtPrice: 36900000,
  stock: 3,
  sku: "SKU-1",
  images: ["/images/registered-fridge.png"],
  category: { id: "category-1", name: "یخچال", slug: "fridges" },
  attributes: [
    { key: "برند", value: "برند ثبت‌شده" },
    { key: "مدل", value: "FR-2" },
    { key: "رنگ", value: "سفید" },
    { key: "گارانتی", value: "ضمانت ثبت‌شده" },
    { key: "زمان ارسال", value: "هماهنگی با خریدار" },
    { key: "ظرفیت", value: "530 لیتر" },
  ].map((attribute) => ({
    ...attribute,
    createdAt: timestamp,
    updatedAt: timestamp,
  })),
  isActive: true,
  isFeatured: false,
  soldCount: 0,
  createdAt: timestamp,
  updatedAt: timestamp,
};

function render(overrides: Partial<StoreProductDTO> = {}, quantity = 0) {
  return renderToStaticMarkup(
    <ProductDetails
      product={{ ...product, ...overrides }}
      relatedProducts={[]}
      initialQuantity={quantity}
    />,
  );
}

it("uses the current encoded category slug and removes inactive category links", () => {
  const category = { ...product.category, slug: "دسته-تازه", isActive: true };
  expect(render({ category })).toContain(
    `/categories/${encodeURIComponent(category.slug)}`,
  );
  expect(render({ category: { ...category, isActive: false } })).not.toContain(
    "/categories/",
  );
});

it("renders registered product fields and omits preview content and feedback UI", () => {
  const markup = render();
  for (const value of [
    product.title,
    product.description,
    "برند ثبت‌شده",
    "FR-۲",
    "سفید",
    "ضمانت ثبت‌شده",
    "هماهنگی با خریدار",
    "۵۳۰ لیتر",
    formatPrice(product.price),
    formatPrice(product.compareAtPrice!),
    "۴٪",
    'href="/categories/fridges"',
    'href="#description"',
    'href="#specifications"',
    'href="#related"',
  ])
    expect(markup).toContain(value);
  expect(markup).toContain(encodeURIComponent(product.images[0]));
  for (const value of [
    "پیش‌نمایش",
    "آزمایشی",
    "دیدگاه",
    "پرسش",
    "customer-reviews",
    'id="questions"',
    "LX-S600",
    'type="radio"',
  ])
    expect(markup).not.toContain(value);
});

it("shows missing optional data honestly and renders the related-product empty state", () => {
  const markup = render({
    attributes: [],
    sku: undefined,
    compareAtPrice: undefined,
    pricing: getProductPricing({ price: product.price }),
  });
  for (const value of [
    "برند نامشخص",
    "اطلاعات رنگ در دسترس نیست",
    "اطلاعات گارانتی در دسترس نیست",
    "زمان ارسال مشخص نشده است",
    "ویژگی دیگری برای این محصول ثبت نشده است.",
    "کالای مشابهی برای نمایش وجود ندارد.",
  ])
    expect(markup).toContain(value);
  expect(markup).not.toContain("<del>");
  expect(markup).not.toContain("گارانتی ۲۴ ماهه");
});

it("uses the supplied server cart quantity and disables purchases beyond available stock", () => {
  const markup = render({}, 3);
  expect(markup).toContain('name="product" value="507f1f77bcf86cd799439011"');
  expect(markup).toContain('name="quantity" value="3"');
  expect(markup).toMatch(/aria-label="افزایش تعداد" disabled=""/);
  expect(markup).toContain('href="/cart"');
  const unavailable = render({ stock: 0 });
  expect(unavailable).toMatch(/<button[^>]*value="add"[^>]*disabled=""/);
  expect(unavailable).toContain("ناموجود");
});
