import "server-only";
import { z } from "zod";

const requiredText = z
  .string({ error: "این تنظیم الزامی است" })
  .trim()
  .min(1, "این تنظیم الزامی است");
const httpUrl = requiredText
  .url("نشانی معتبر نیست")
  .refine(
    (value) => /^https?:\/\//.test(value),
    "نشانی باید با http یا https شروع شود",
  );
const money = requiredText
  .regex(/^\d+$/, "مبلغ باید عدد صحیح نامنفی باشد")
  .transform(Number)
  .refine(Number.isSafeInteger, "مبلغ خارج از محدودهٔ مجاز است");

const imageOrigin = httpUrl
  .refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return (
      !url.hostname.includes("*") &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    );
  }, "مبدأ تصویر باید فقط شامل پروتکل، دامنه و پورت باشد")
  .transform((value) => new URL(value).origin);

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    MONGODB_URI: requiredText.regex(
      /^mongodb(?:\+srv)?:\/\/\S+$/,
      "نشانی MongoDB معتبر نیست",
    ),
    AUTH_SECRET: requiredText,
    AUTH_URL: httpUrl.optional(),
    NEXT_PUBLIC_SITE_URL: httpUrl,
    IMAGE_INTERNAL_ORIGINS: z
      .string()
      .default("")
      .transform((value) =>
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      )
      .pipe(z.array(imageOrigin)),
    NEXT_PUBLIC_SITE_NAME: requiredText,
    PAYMENT_PROVIDER: z.literal("fake", { error: "درگاه پرداخت معتبر نیست" }),
    SEED_ADMIN_EMAIL: z.email({ error: "ایمیل ادمین معتبر نیست" }).optional(),
    SEED_ADMIN_PASSWORD: z
      .string()
      .min(8, "رمز ادمین باید حداقل ۸ کاراکتر باشد")
      .optional(),
    SHIPPING_FLAT_FEE: money,
    FREE_SHIPPING_THRESHOLD: money,
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === "production" && !value.AUTH_URL) {
      context.addIssue({
        code: "custom",
        path: ["AUTH_URL"],
        message: "نشانی احراز هویت در محیط عملیاتی الزامی است",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    // Report keys and messages only, never configuration values or secrets.
    throw new Error(
      `تنظیمات محیطی نامعتبر است: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("؛ ")}`,
    );
  }
  return result.data;
}
