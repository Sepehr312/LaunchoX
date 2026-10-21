import { describe, expect, it } from "vitest";
import { getProductDetailsData } from "@/components/store/product-details-data";
const productFixture = {
  price: 112600000,
  compareAtPrice: 128000000,
  images: ["/images/product.png"],
  category: { id: "category-1", name: "ساید بای ساید", slug: "side-by-side" },
  attributes: [],
  sku: "SKU-1",
  createdAt: "2026-10-13T00:00:00.000Z",
  updatedAt: "2026-10-13T00:00:00.000Z",
};

describe("product detail data mapping", () => {
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

  it("does not manufacture a discount when a previous price is absent or invalid", () => {
    expect(
      getProductDetailsData({ ...productFixture, compareAtPrice: undefined })
        .discountPercent,
    ).toBe(0);
    expect(
      getProductDetailsData({
        ...productFixture,
        compareAtPrice: productFixture.price,
      }).discountPercent,
    ).toBe(0);
    expect(
      getProductDetailsData({
        ...productFixture,
        price: 35400000,
        compareAtPrice: 36900000,
      }).discountPercent,
    ).toBe(4);
  });
});
