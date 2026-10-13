import { describe, expect, it } from "vitest";
import {
  brandIdSchema,
  createBrandSchema,
  updateBrandSchema,
} from "@/validations/brand";

describe.each([createBrandSchema, updateBrandSchema])(
  "brand input",
  (schema) => {
    it("normalizes text, digits and booleans and strips unknown fields", () => {
      expect(
        schema.parse({
          name: " برند ",
          slug: " ",
          logo: " /images/brand.svg ",
          website: " https://example.com ",
          description: " توضیح ",
          country: " ایران ",
          order: "۲",
          isActive: "off",
          isFeatured: "on",
          role: "admin",
        }),
      ).toEqual({
        name: "برند",
        slug: undefined,
        logo: "/images/brand.svg",
        website: "https://example.com",
        description: "توضیح",
        country: "ایران",
        order: 2,
        isActive: false,
        isFeatured: true,
      });
      expect(schema.parse({ name: "برند" })).toMatchObject({
        order: 0,
        isActive: true,
        isFeatured: false,
      });
    });

    it.each([
      { name: " " },
      { name: undefined },
      { slug: "invalid slug" },
      { logo: "bad" },
      { logo: "/images/../brand.svg" },
      { logo: "//example.com/logo" },
      { website: "javascript:alert(1)" },
      { website: "/local" },
      { order: -1 },
      { order: 0.5 },
      { order: Number.MAX_SAFE_INTEGER + 1 },
      { isActive: null },
      { isFeatured: "yes" },
    ])("rejects invalid fields %j", (patch) => {
      expect(schema.safeParse({ name: "برند", ...patch }).success).toBe(false);
    });
  },
);

it("validates brand identifiers without accepting query objects", () => {
  expect(brandIdSchema.parse("507f1f77bcf86cd799439011")).toBe(
    "507f1f77bcf86cd799439011",
  );
  for (const id of ["invalid", "", undefined, { $ne: null }])
    expect(brandIdSchema.safeParse(id).success).toBe(false);
});
