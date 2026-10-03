import { z } from "zod";
import {
  assetUrlSchema,
  booleanSchema,
  integerSchema,
  objectIdSchema,
  optionalField,
  requiredString,
  slugSchema,
} from "@/validations/common";

export const categorySchema = z.object({
  name: requiredString,
  slug: optionalField(slugSchema),
  parent: optionalField(objectIdSchema),
  description: optionalField(requiredString),
  image: optionalField(assetUrlSchema),
  order: integerSchema().default(0),
  isActive: booleanSchema.default(true),
});
export type CategoryInput = z.infer<typeof categorySchema>;
