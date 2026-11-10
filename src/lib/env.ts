import "server-only";
import { z } from "zod";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

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

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const rawEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    MONGODB_URI: requiredText.regex(
      /^mongodb(?:\+srv)?:\/\/\S+$/,
      "نشانی MongoDB معتبر نیست",
    ),
    AUTH_SECRET: requiredText,
    SMS_IR_API_KEY: z.string().trim().optional(),
    SMS_IR_TEMPLATE_ID: z.coerce.number().int().positive().default(608073),
    SMS_IR_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    OWNER_NEW_PASSWORD: z.string().optional(),
    AUTH_TRUST_PROXY_HEADERS: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    AUTH_URL: httpUrl.optional(),
    NEXT_PUBLIC_SITE_URL: httpUrl,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: z
      .string()
      .trim()
      .regex(/^$|^G-[A-Z0-9]+$/, "شناسهٔ گوگل آنالیتیکس معتبر نیست")
      .default(""),
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
    CONTACT_PHONE: z
      .string()
      .trim()
      .regex(/^$|^\+?[0-9 ()-]{7,24}$/, "شماره تماس معتبر نیست")
      .default(""),
    CONTACT_EMAIL: z
      .union([z.literal(""), z.email({ error: "ایمیل تماس معتبر نیست" })])
      .default(""),
    CONTACT_ADDRESS: z.string().trim().max(500).default(""),
    PAYMENT_PROVIDER: z.literal("fake", { error: "درگاه پرداخت معتبر نیست" }),
    SEED_ADMIN_EMAIL: z.email({ error: "ایمیل ادمین معتبر نیست" }).optional(),
    SEED_ADMIN_PASSWORD: z
      .string()
      .min(8, "رمز ادمین باید حداقل ۸ کاراکتر باشد")
      .optional(),
    SHIPPING_FLAT_FEE: money,
    FREE_SHIPPING_THRESHOLD: money,
  })
  .transform((value) => ({
    ...value,
    AUTH_URL: value.AUTH_URL ?? value.NEXT_PUBLIC_SITE_URL,
  }))
  .superRefine((value, context) => {
    if (
      value.NODE_ENV === "production" &&
      (value.AUTH_SECRET.length < 32 ||
        /replace-with|change-?me|example|test-secret/i.test(value.AUTH_SECRET))
    ) {
      context.addIssue({
        code: "custom",
        path: ["AUTH_SECRET"],
        message:
          "کلید احراز هویت عملیاتی باید تصادفی، حداقل ۳۲ کاراکتر و غیرنمونه باشد",
      });
    }
    if (value.NODE_ENV === "production" && !value.AUTH_URL) {
      context.addIssue({
        code: "custom",
        path: ["AUTH_URL"],
        message: "نشانی احراز هویت در محیط عملیاتی الزامی است",
      });
    }
  });

export const envSchema = z.preprocess((input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const values = { ...input } as Record<string, unknown>;
  for (const key of [
    "NODE_ENV",
    "AUTH_TRUST_PROXY_HEADERS",
    "AUTH_URL",
    "IMAGE_INTERNAL_ORIGINS",
    "CONTACT_PHONE",
    "CONTACT_EMAIL",
    "CONTACT_ADDRESS",
    "SEED_ADMIN_EMAIL",
    "SEED_ADMIN_PASSWORD",
  ])
    values[key] = emptyToUndefined(values[key]);
  return values;
}, rawEnvSchema);

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  // Build workers need public metadata but may have no runtime database configuration.
  const input = { ...process.env };
  if (
    input.NEXT_PHASE === PHASE_PRODUCTION_BUILD &&
    !requiredText
      .regex(/^mongodb(?:\+srv)?:\/\/\S+$/)
      .safeParse(input.MONGODB_URI).success
  ) {
    input.MONGODB_URI = "mongodb://127.0.0.1:1/launchox-build-unavailable";
  }
  const result = envSchema.safeParse(input);
  if (!result.success) {
    // Report keys and messages only, never configuration values or secrets.
    throw new Error(
      `تنظیمات محیطی نامعتبر است: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("؛ ")}`,
    );
  }
  return result.data;
}
