import { z } from "zod";
import { emailSchema, requiredString } from "@/validations/common";

export const passwordSchema = z
  .string()
  .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد")
  .regex(/\p{L}/u, "رمز عبور باید دست‌کم یک حرف داشته باشد")
  .regex(/\p{N}/u, "رمز عبور باید دست‌کم یک رقم داشته باشد")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "رمز عبور نباید بیش از ۷۲ بایت باشد",
  );
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "رمز عبور الزامی است"),
});
export const registerSchema = z
  .object({
    name: requiredString
      .min(2, "نام باید حداقل ۲ کاراکتر باشد")
      .max(60, "نام باید حداکثر ۶۰ کاراکتر باشد"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "تکرار رمز عبور یکسان نیست",
  });
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export const callbackUrlSchema = z
  .string()
  .max(2048)
  .refine((value) => {
    if (
      !value.startsWith("/") ||
      value.startsWith("//") ||
      /[\\\s\u0000-\u001f]/u.test(value)
    )
      return false;
    try {
      const url = new URL(value, "https://launchox.local");
      const decoded = decodeURIComponent(value);
      return (
        url.origin === "https://launchox.local" &&
        !decoded.startsWith("//") &&
        !/[\\\u0000-\u001f]/u.test(decoded) &&
        !/^\/(?:login|register|api\/auth)(?:[/?#]|$)/.test(url.pathname)
      );
    } catch {
      return false;
    }
  });

export function safeCallbackUrl(value: unknown): string {
  const parsed = callbackUrlSchema.safeParse(value);
  return parsed.success ? parsed.data : "/account";
}
