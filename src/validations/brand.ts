import { z } from "zod";
import {
  assetUrlSchema,
  booleanSchema,
  integerSchema,
  objectIdSchema,
  optionalField,
  requiredString,
  slugSchema,
  urlSchema,
} from "@/validations/common";

export const brandIdSchema = objectIdSchema;

export const createBrandSchema = z.object({
  name: requiredString,
  slug: optionalField(slugSchema),
  logo: optionalField(requiredString.pipe(assetUrlSchema)),
  description: optionalField(requiredString),
  country: optionalField(requiredString),
  website: optionalField(requiredString.pipe(urlSchema)),
  isActive: booleanSchema.default(true),
  isFeatured: booleanSchema.default(false),
  order: integerSchema().default(0),
});

// Admin edits submit the complete form, matching category administration.
export const updateBrandSchema = createBrandSchema.clone();
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
