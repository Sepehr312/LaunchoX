import type { StoreProductDTO } from "@/types/dto";

export function getProductDetailsData(
  product: Pick<
    StoreProductDTO,
    "attributes" | "pricing" | "images" | "category" | "sku"
  >,
) {
  function attribute(...keys: string[]) {
    return product.attributes.find((item) => keys.includes(item.key))?.value;
  }

  return {
    brand: attribute("برند"),
    model: attribute("مدل"),
    color: attribute("رنگ"),
    warranty: attribute("گارانتی", "ضمانت"),
    shipping: attribute("ارسال", "زمان ارسال"),
    discountPercent: product.pricing.discountPercent,
    galleryViews: product.images.map((src, index) => ({
      src,
      label: product.images.length === 1 ? "تصویر محصول" : `تصویر ${index + 1}`,
      scale: 1,
      position: "50% 50%",
    })),
    specifications: [
      {
        title: "مشخصات کلی",
        rows: [
          ["دسته‌بندی", product.category.name],
          ...(product.sku ? [["شناسه کالا", product.sku]] : []),
          ...product.attributes.map(({ key, value }) => [key, value]),
        ],
      },
    ],
  };
}
