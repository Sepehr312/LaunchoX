import type { StoreProductDTO } from "@/types/dto";
import { isOtherFeaturesAttribute } from "@/validations/product-attributes";

export function getProductDetailsData(
  product: Pick<
    StoreProductDTO,
    "attributes" | "pricing" | "images" | "category" | "sku"
  >,
) {
  function attribute(...keys: string[]) {
    return product.attributes.find((item) => keys.includes(item.key))?.value;
  }

  const preferred = [
    ["نوع یخچال فریزر", "نوع محصول", "نوع یخچال", "نوع"],
    ["گرید انرژی", "رده انرژی", "رده مصرف انرژی", "رتبه انرژی"],
    ["گنجایش کل به لیتر", "ظرفیت", "ظرفیت کل", "گنجایش کل"],
    ["وزن", "وزن خالص"],
  ];
  const normalizeKey = (key: string) => key.replace(/[\s\u200c]+/g, " ").trim();
  const candidates = product.attributes.filter(
    (item) =>
      item.key.trim() &&
      item.value.trim() &&
      !isOtherFeaturesAttribute(item.key) &&
      !["مدل", "رنگ", "برند", "منبع اطلاعات"].includes(normalizeKey(item.key)),
  );
  const features: { key: string; value: string }[] = [];
  const usedKeys = new Set<string>();
  for (const keys of preferred) {
    const selected = keys.flatMap((key) =>
      candidates.filter((item) => normalizeKey(item.key) === key),
    )[0];
    if (!selected) continue;
    features.push({ key: keys[0], value: selected.value });
    keys.forEach((key) => usedKeys.add(key));
  }
  for (const item of candidates) {
    if (features.length === 4) break;
    const key = normalizeKey(item.key);
    if (usedKeys.has(key)) continue;
    features.push({ key: item.key, value: item.value });
    usedKeys.add(key);
  }

  return {
    features,
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
