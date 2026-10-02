import { z } from "zod";
import { emailSchema, requiredString } from "@/validations/common";

const passwordSchema = z
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
