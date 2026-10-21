import { z } from "zod";
import { objectIdSchema } from "@/validations/common";

export const COMPARE_PRODUCT_LIMIT = 4;
export const COMPARE_RAW_ID_LIMIT = 32;
export const COMPARE_PAGE_LIMIT = 100;
export const COMPARE_PAGE_SIZE = 12;

const compareIdSchema = z
  .string()
  .max(64)
  .trim()
  .pipe(objectIdSchema)
  .transform((id) => id.toLowerCase());

export const compareIdsSchema = z
  .array(z.string())
  .max(COMPARE_RAW_ID_LIMIT, "تعداد شناسه‌های ورودی بیش از حد مجاز است")
  .pipe(z.array(compareIdSchema))
  .transform((ids) => [...new Set(ids)])
  .pipe(
    z
      .array(z.string())
      .max(COMPARE_PRODUCT_LIMIT, "حداکثر چهار محصول قابل مقایسه است"),
  );
export const compareSearchSchema = z.object({
  q: z.string().trim().max(100).default(""),
  page: z.number().int().min(1).max(COMPARE_PAGE_LIMIT).default(1),
});
export const compareUrlSchema = z
  .string()
  .max(COMPARE_RAW_ID_LIMIT * 65 - 1)
  .transform((value) => (value ? value.split(",") : []))
  .pipe(compareIdsSchema);

export function parseCompareIds(value: unknown): string[] {
  const parsed = compareUrlSchema.safeParse(value ?? "");
  return parsed.success ? parsed.data : [];
}
