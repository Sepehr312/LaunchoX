import { describe, expect, it } from "vitest";
import { getRealPreviewData } from "@/components/store/product-details-data";
import { mockProduct } from "@/components/preview/product/mock-product";

describe("real product preview mapping", () => {
  it("uses registered images and attributes without adding mock specifications", () => {
    const product = {
      ...mockProduct,
      sku: "REAL-1",
      images: [
        "/images/preview/categories/side-by-side.png",
        "/images/preview/categories/french-door.png",
      ],
      attributes: [
        {
          key: "ظرفیت",
          value: "530 لیتر",
          createdAt: mockProduct.createdAt,
          updatedAt: mockProduct.updatedAt,
        },
      ],
    };
    const data = getRealPreviewData(product);
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
      getRealPreviewData({ ...mockProduct, compareAtPrice: undefined })
        .discountPercent,
    ).toBe(0);
    expect(
      getRealPreviewData({ ...mockProduct, compareAtPrice: mockProduct.price })
        .discountPercent,
    ).toBe(0);
    expect(
      getRealPreviewData({
        ...mockProduct,
        price: 35400000,
        compareAtPrice: 36900000,
      }).discountPercent,
    ).toBe(4);
  });
});
