import { z } from "zod";
import { booleanSchema, objectIdSchema } from "@/validations/common";
import { userRoles } from "@/types/domain";

export const userRoleValueSchema = z.enum(userRoles, {
  error: "نقش کاربر معتبر نیست",
});
export const userRoleSchema = z.object({
  id: objectIdSchema,
  role: userRoleValueSchema,
});

export const userActiveSchema = z.object({
  id: objectIdSchema,
  isActive: booleanSchema,
});
