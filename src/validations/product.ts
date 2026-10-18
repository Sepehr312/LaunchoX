import { z } from "zod";
import {
  assetUrlSchema,
  booleanSchema,
  integerSchema,
  moneySchema,
  objectIdSchema,
  optionalField,
  paginationSchema,
  requiredString,
  slugSchema,
} from "@/validations/common";

export const productSchema = z
  .object({
    title: requiredString
      .min(3, "عنوان باید حداقل ۳ کاراکتر باشد")
      .max(150, "عنوان باید حداکثر ۱۵۰ کاراکتر باشد"),
    slug: optionalField(slugSchema),
    description: requiredString,
    price: moneySchema,
    compareAtPrice: optionalField(moneySchema),
    stock: integerSchema(),
    sku: optionalField(requiredString),
    images: z
      .array(assetUrlSchema)
      .min(1, "حداقل یک تصویر الزامی است")
      .max(8, "حداکثر ۸ تصویر مجاز است"),
    category: objectIdSchema,
    attributes: z
      .array(z.object({ key: requiredString, value: requiredString }))
      .default([]),
    isActive: booleanSchema.default(true),
    isFeatured: booleanSchema.default(false),
  })
  .refine(
    (value) =>
      value.compareAtPrice === undefined || value.compareAtPrice > value.price,
    {
      path: ["compareAtPrice"],
      message: "قیمت قبلی باید بیشتر از قیمت فروش باشد",
    },
  );

export const adminProductSchema = productSchema.safeExtend({
  brand: z
    .string({ error: "انتخاب برند الزامی است" })
    .trim()
    .min(1, "انتخاب برند الزامی است")
    .pipe(objectIdSchema),
});

export const productQuerySchema = paginationSchema
  .extend({
    category: optionalField(objectIdSchema),
    brandSlug: optionalField(slugSchema),
    q: optionalField(requiredString),
    minPrice: optionalField(moneySchema),
    maxPrice: optionalField(moneySchema),
    sort: z
      .enum(["newest", "price_asc", "price_desc", "bestselling", "discount"])
      .default("newest"),
    inStock: booleanSchema.optional(),
    brands: z.array(requiredString.max(100)).max(50).optional(),
    energies: z.array(requiredString.max(30)).max(50).optional(),
    capacity: z.enum(["all", "small", "medium", "large"]).optional(),
    discounted: booleanSchema.optional(),
  })
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    {
      path: ["maxPrice"],
      message: "حداکثر قیمت باید از حداقل قیمت کمتر نباشد",
    },
  );
export type ProductInput = z.infer<typeof productSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
