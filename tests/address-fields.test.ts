import { describe, expect, it } from "vitest";
import { addressSchema } from "@/validations/address";
import {
  addressProvinces,
  filterAddressInput,
  getAddressCities,
} from "@/validations/address-fields";
import { addressInput } from "./fixtures";

describe("address entry", () => {
  it("keeps Persian names, spaces and half spaces while removing Latin letters, digits and symbols", () => {
    expect(filterAddressInput("recipientName", "Aliعلي ۱۲3!رضايي")).toBe(
      "علی رضایی",
    );
    expect(filterAddressInput("recipientName", "محمد\u200cرضا کریمی")).toBe(
      "محمد\u200cرضا کریمی",
    );
    expect(
      addressSchema.parse({ ...addressInput, recipientName: "علي كريمي" })
        .recipientName,
    ).toBe("علی کریمی");
  });
  it("accepts all three digit sets for phone and postal inputs and removes other characters", () => {
    expect(filterAddressInput("mobile", "a۰۹۱۲34٥٦٧٨٩!")).toBe("۰۹۱۲۳۴۵۶۷۸۹");
    expect(filterAddressInput("postalCode", "12-۳۴ ٥٦/۷۸۹۰")).toBe(
      "۱۲۳۴۵۶۷۸۹۰",
    );
    expect(filterAddressInput("addressLine", "پلاک ۱۲، واحد A\nطبقه دوم")).toBe(
      "پلاک ۱۲، واحد A\nطبقه دوم",
    );
  });
  it("offers each province once, with cities scoped to that province", () => {
    expect(addressProvinces).toHaveLength(31);
    expect(new Set(addressProvinces).size).toBe(31);
    for (const province of addressProvinces) {
      const cities = getAddressCities(province);
      expect(cities.length).toBeGreaterThan(0);
      expect(new Set(cities).size).toBe(cities.length);
      for (const city of cities)
        expect(
          addressSchema.safeParse({ ...addressInput, province, city }).success,
        ).toBe(true);
    }
    expect(getAddressCities("تهران")).toContain("تهران");
    expect(getAddressCities("فارس")).toContain("شیراز");
    expect(getAddressCities("فارس")).not.toContain("تهران");
    expect(getAddressCities("")).toEqual([]);
  });
});
