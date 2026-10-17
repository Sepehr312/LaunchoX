import { z } from "zod";
import {
  booleanSchema,
  mobileSchema,
  postalCodeSchema,
  requiredString,
} from "@/validations/common";
import {
  addressProvinces,
  getAddressCities,
  normalizeLocation,
  normalizePersianText,
  persianNamePattern,
} from "@/validations/address-fields";

export const addressSchema = z
  .object({
    title: requiredString,
    recipientName: requiredString
      .transform(normalizePersianText)
      .pipe(
        z
          .string()
          .regex(
            persianNamePattern,
            "نام و نام خانوادگی را فقط با حروف فارسی وارد کنید",
          ),
      ),
    mobile: mobileSchema,
    province: requiredString
      .transform(normalizeLocation)
      .refine(
        (value) => addressProvinces.includes(value),
        "استان را از فهرست انتخاب کنید",
      ),
    city: requiredString.transform(normalizeLocation),
    postalCode: postalCodeSchema,
    addressLine: requiredString,
    isDefault: booleanSchema.default(false),
  })
  .refine((value) => getAddressCities(value.province).includes(value.city), {
    path: ["city"],
    message: "شهر را از فهرست شهرهای استان انتخاب کنید",
  });
export type AddressInput = z.infer<typeof addressSchema>;
