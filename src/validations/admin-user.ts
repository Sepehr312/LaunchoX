import { z } from "zod";
import { booleanSchema, objectIdSchema } from "@/validations/common";

export const userActiveSchema = z.object({
  id: objectIdSchema,
  isActive: booleanSchema,
});
