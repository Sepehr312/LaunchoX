import { z } from "zod";
import {
  mobileSchema,
  optionalField,
  requiredString,
} from "@/validations/common";
import { passwordSchema } from "@/validations/auth";
export const profileSchema = z.object({
  name: requiredString
    .min(2, "نام باید حداقل ۲ کاراکتر باشد")
    .max(60, "نام باید حداکثر ۶۰ کاراکتر باشد"),
  mobile: optionalField(mobileSchema),
});
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "رمز فعلی الزامی است")
      .max(72, "رمز فعلی بیش از حد طولانی است"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "تکرار رمز عبور یکسان نیست",
  });
