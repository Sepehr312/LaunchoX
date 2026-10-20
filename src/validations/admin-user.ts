import { z } from "zod";
import { booleanSchema, objectIdSchema } from "@/validations/common";
import { userRoles } from "@/types/domain";

export const userRoleValueSchema = z.enum(userRoles, {
  error: "نقش کاربر معتبر نیست",
});
const confirmationPasswordSchema = z
  .string({ error: "رمز تأیید معتبر نیست" })
  .max(72, "رمز تأیید بیش از حد طولانی است")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "رمز تأیید بیش از حد طولانی است",
  )
  .optional();
export const userRoleSchema = z.object({
  id: objectIdSchema,
  role: userRoleValueSchema,
  confirmationPassword: confirmationPasswordSchema,
});

export const userActiveSchema = z.object({
  id: objectIdSchema,
  isActive: booleanSchema,
  confirmationPassword: confirmationPasswordSchema,
});
