import { z } from "zod";
import {
  emailSchema,
  optionalField,
  requiredString,
} from "@/validations/common";
import {
  passwordSchema,
  passwordByteLength,
  PASSWORD_MAX_BYTES,
} from "@/validations/auth";
export const profileSchema = z.object({
  name: requiredString
    .min(2, "نام باید حداقل ۲ کاراکتر باشد")
    .max(60, "نام باید حداکثر ۶۰ کاراکتر باشد"),
  email: optionalField(emailSchema),
});
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "رمز فعلی الزامی است")
      .refine(
        (value) => passwordByteLength(value) <= PASSWORD_MAX_BYTES,
        "رمز فعلی بیش از حد طولانی است",
      ),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "تکرار رمز عبور یکسان نیست",
  });
