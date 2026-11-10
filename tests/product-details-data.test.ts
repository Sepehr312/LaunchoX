import { describe, expect, it, vi } from "vitest";
import { getProductDetailsData } from "@/components/store/product-details-data";
import { getProductPricing } from "@/lib/product-pricing";
import { isOtherFeaturesAttribute } from "@/validations/product-attributes";
vi.mock("server-only", () => ({}));
const productFixture = {
  price: 112600000,
  pricing: getProductPricing({ price: 112600000, compareAtPrice: 128000000 }),
  compareAtPrice: 128000000,
  images: ["/images/product.png"],
  category: { id: "category-1", name: "ساید بای ساید", slug: "side-by-side" },
  attributes: [],
  sku: "SKU-1",
  createdAt: "2026-10-13T00:00:00.000Z",
  updatedAt: "2026-10-13T00:00:00.000Z",
};

describe("product detail data mapping", () => {
  it("identifies only the other-features rows requested for removal", () => {
    for (const key of [
      "سایر ویژگی‌ها",
      "سایر ویژگی ها",
      "سایر ویژگی های یخچال",
      "سایر ویژگی‌های فریزر",
    ])
      expect(isOtherFeaturesAttribute(key)).toBe(true);
    for (const key of [
      "ویژگی های یخچال فریزر",
      "امکانات اختصاصی یخچال",
      "وزن",
      "سایر مشخصات",
      "گرید انرژی",
    ])
      expect(isOtherFeaturesAttribute(key)).toBe(false);
  });
  function withAttributes(attributes: { key: string; value: string }[]) {
    return {
      ...productFixture,
      attributes: attributes.map((item) => ({
        ...item,
        createdAt: productFixture.createdAt,
        updatedAt: productFixture.updatedAt,
      })),
    };
  }

  it("prioritizes the four requested highlights without truncating the technical table", () => {
    const product = withAttributes([
      { key: "شناسه کالا", value: "123" },
      { key: "وزن", value: "80 کیلوگرم" },
      { key: "گنجایش کل به لیتر", value: "435" },
      { key: "رده انرژی", value: "B" },
      { key: "گرید انرژی", value: "A++" },
      { key: "نوع یخچال فریزر", value: "فریزر پایین" },
      { key: "ارتفاع", value: "186 سانتی‌متر" },
    ]);
    const data = getProductDetailsData(product);
    expect(data.features).toEqual([
      { key: "نوع یخچال فریزر", value: "فریزر پایین" },
      { key: "گرید انرژی", value: "A++" },
      { key: "گنجایش کل به لیتر", value: "435" },
      { key: "وزن", value: "80 کیلوگرم" },
    ]);
    expect(data.specifications[0].rows).toEqual([
      ["دسته‌بندی", product.category.name],
      ["شناسه کالا", product.sku],
      ...product.attributes.map(({ key, value }) => [key, value]),
    ]);
  });

  it("fills missing highlights in stored order without duplicating aliases or metadata", () => {
    const product = withAttributes([
      { key: "منبع اطلاعات", value: "https://example.com" },
      { key: "سایر ویژگی‌ها", value: "متن اضافی" },
      { key: "رده انرژی", value: "A+" },
      { key: "ارتفاع", value: "180" },
      { key: "ظرفیت", value: "500 لیتر" },
      { key: "عمق", value: "70" },
      { key: "عرض", value: "80" },
    ]);
    expect(getProductDetailsData(product).features).toEqual([
      { key: "گرید انرژی", value: "A+" },
      { key: "گنجایش کل به لیتر", value: "500 لیتر" },
      { key: "ارتفاع", value: "180" },
      { key: "عمق", value: "70" },
    ]);
    expect(getProductDetailsData(withAttributes([])).features).toEqual([]);
  });

  it("uses registered images and attributes without adding mock specifications", () => {
    const product = {
      ...productFixture,
      sku: "REAL-1",
      images: [
        "/images/preview/categories/side-by-side.png",
        "/images/preview/categories/french-door.png",
      ],
      attributes: [
        {
          key: "ظرفیت",
          value: "530 لیتر",
          createdAt: productFixture.createdAt,
          updatedAt: productFixture.updatedAt,
        },
      ],
    };
    const data = getProductDetailsData(product);
    expect(data.galleryViews.map((view) => view.src)).toEqual(product.images);
    expect(data.galleryViews.every((view) => view.scale === 1)).toBe(true);
    expect(data.specifications).toEqual([
      {
        title: "مشخصات کلی",
        rows: [
          ["دسته‌بندی", product.category.name],
          ["شناسه کالا", "REAL-1"],
          ["ظرفیت", "530 لیتر"],
        ],
      },
    ]);
    expect(data.brand).toBeUndefined();
    expect(data.model).toBeUndefined();
    expect(data.color).toBeUndefined();
    expect(data.warranty).toBeUndefined();
    expect(data.shipping).toBeUndefined();
  });

  it("uses server pricing for discounted and undiscounted products", () => {
    for (const input of [
      { price: 0 },
      { price: 112600000 },
      { price: 35400000, compareAtPrice: 36900000 },
    ]) {
      const pricing = getProductPricing(input);
      expect(
        getProductDetailsData({ ...productFixture, pricing }).discountPercent,
      ).toBe(pricing.discountPercent);
    }
  });
});
