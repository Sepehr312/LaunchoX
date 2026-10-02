import { z } from "zod";
import {
  booleanSchema,
  integerSchema,
  objectIdSchema,
  optionalField,
  requiredString,
  slugSchema,
  urlSchema,
} from "@/validations/common";

export const categorySchema = z.object({
  name: requiredString,
  slug: optionalField(slugSchema),
  parent: optionalField(objectIdSchema),
  description: optionalField(requiredString),
  image: optionalField(urlSchema),
  order: integerSchema().default(0),
  isActive: booleanSchema.default(true),
});
export type CategoryInput = z.infer<typeof categorySchema>;
