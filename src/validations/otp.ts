import { z } from "zod";
import { normalizeDigits } from "@/lib/format";
import { passwordSchema } from "@/validations/auth";

export const loginMobileSchema = z
  .string({ error: "شمارهٔ موبایل الزامی است" })
  .max(11, "شمارهٔ موبایل باید ۱۱ رقم و با ۰۹ شروع شود")
  .transform(normalizeDigits)
  .pipe(
    z.string().regex(/^09\d{9}$/, "شمارهٔ موبایل باید ۱۱ رقم و با ۰۹ شروع شود"),
  );

export function filterMobileInput(value: string, previous: string): string {
  const digits = value.replace(/[^0-9۰-۹٠-٩]/g, "").slice(0, 11);
  return /^(?:0(?:9\d{0,9})?)?$/.test(normalizeDigits(digits))
    ? digits
    : previous;
}
export const otpCodeSchema = z
  .string({ error: "کد تأیید الزامی است" })
  .max(12, "کد تأیید معتبر نیست")
  .transform((value) => normalizeDigits(value.trim()))
  .pipe(z.string().regex(/^\d{6}$/, "کد تأیید باید شش رقم باشد"));
export const otpPurposeSchema = z.enum(
  ["login", "set-password", "recovery", "change-mobile", "admin-enrollment"],
  { error: "نوع درخواست معتبر نیست" },
);
export const challengeIdSchema = z
  .string({ error: "درخواست معتبر نیست" })
  .regex(/^[a-f0-9]{64}$/, "درخواست معتبر نیست");
export const otpRequestSchema = z.object({
  mobile: loginMobileSchema,
  purpose: otpPurposeSchema,
});
export const otpVerifySchema = otpRequestSchema.extend({
  challengeId: challengeIdSchema,
  code: otpCodeSchema,
});
export const mobilePasswordSchema = z.object({
  mobile: loginMobileSchema,
  password: z
    .string({ error: "رمز عبور الزامی است" })
    .min(1, "رمز عبور الزامی است")
    .refine(
      (value) => new TextEncoder().encode(value).length <= 72,
      "رمز عبور بیش از حد طولانی است",
    ),
});
export const newPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string({ error: "تکرار رمز عبور الزامی است" }),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "تکرار رمز عبور یکسان نیست",
  });
export type OtpPurpose = z.infer<typeof otpPurposeSchema>;
