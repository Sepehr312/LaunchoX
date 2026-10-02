import { z } from "zod";
import { normalizeDigits, toPersianDigits } from "@/lib/format";

// Keep built-in type errors Persian as well as the field-specific messages.
z.config(z.locales.fa());

export const requiredString = z.string().trim().min(1, "این فیلد الزامی است");
export const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "شناسه معتبر نیست");
export const slugSchema = requiredString.regex(
  /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u,
  "نامک معتبر نیست",
);
export const urlSchema = z.url({
  protocol: /^https?$/,
  error: "نشانی اینترنتی معتبر نیست",
});
export const mobileSchema = z
  .string()
  .transform((value) => normalizeDigits(value.trim()))
  .pipe(
    z
      .string()
      .regex(/^09\d{9}$/, "شمارهٔ موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد"),
  );
export const postalCodeSchema = z
  .string()
  .transform((value) => normalizeDigits(value.trim()))
  .pipe(z.string().regex(/^\d{10}$/, "کد پستی باید ۱۰ رقم باشد"));
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "ایمیل معتبر نیست" }));
export const booleanSchema = z.preprocess((value) => {
  if (value === "true" || value === "on") return true;
  if (value === "false" || value === "off") return false;
  return value;
}, z.boolean());

export function optionalField<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    schema.optional(),
  );
}

export function integerSchema(min = 0, max = Number.MAX_SAFE_INTEGER) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const normalized = normalizeDigits(value.trim());
      return /^\d+$/.test(normalized) ? Number(normalized) : value;
    },
    z
      .number({ error: "عدد معتبر وارد کنید" })
      .int("عدد باید صحیح باشد")
      .min(min, `عدد باید حداقل ${toPersianDigits(min)} باشد`)
      .max(max, `عدد باید حداکثر ${toPersianDigits(max)} باشد`),
  );
}

export const moneySchema = integerSchema();
export const quantitySchema = integerSchema(1, 10);
export const paginationSchema = z.object({
  page: integerSchema(1).default(1),
  limit: integerSchema(1, 48).default(12),
});
export type PaginationInput = z.infer<typeof paginationSchema>;
