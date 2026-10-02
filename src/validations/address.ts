import { z } from "zod";
import {
  booleanSchema,
  mobileSchema,
  postalCodeSchema,
  requiredString,
} from "@/validations/common";

export const addressSchema = z.object({
  title: requiredString,
  recipientName: requiredString,
  mobile: mobileSchema,
  province: requiredString,
  city: requiredString,
  postalCode: postalCodeSchema,
  addressLine: requiredString,
  isDefault: booleanSchema.default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;
