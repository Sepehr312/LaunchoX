import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { loginSchema, registerSchema } from "@/validations/auth";
import { addressSchema } from "@/validations/address";
import { productQuerySchema, productSchema } from "@/validations/product";
import { categorySchema } from "@/validations/category";
import {
  cartItemSchema,
  guestIdSchema,
  removeCartItemSchema,
} from "@/validations/cart";
import {
  orderSchema,
  orderQuerySchema,
  updateOrderStatusSchema,
} from "@/validations/order";
import {
  booleanSchema,
  objectIdSchema,
  paginationSchema,
} from "@/validations/common";
import { addressInput, productInput, objectId, guestId } from "./fixtures";

function expectInvalid(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  expect(result.success).toBe(false);
  if (!result.success) {
    for (const issue of result.error.issues)
      expect(issue.message).toMatch(/[\u0600-\u06ff]/);
  }
}
const registration = {
  name: "علی رضایی",
  email: "ali@example.com",
  password: "Strong123",
  confirmPassword: "Strong123",
};

describe("authentication input", () => {
  it("normalizes email and strips privileged fields", () => {
    expect(
      loginSchema.parse({
        email: " ALI@Example.com ",
        password: "secret",
        role: "admin",
      }),
    ).toEqual({ email: "ali@example.com", password: "secret" });
    const parsed = registerSchema.parse({
      ...registration,
      role: "admin",
      isActive: true,
      passwordHash: "injected",
    });
    expect(parsed).not.toHaveProperty("role");
    expect(parsed).not.toHaveProperty("isActive");
    expect(parsed).not.toHaveProperty("passwordHash");
  });
  it.each([{ email: "bad" }, { password: "" }, { email: { $ne: null } }])(
    "rejects invalid login %j",
    (patch) =>
      expectInvalid(loginSchema, {
        email: registration.email,
        password: "Strong123",
        ...patch,
      }),
  );
  it.each([
    { name: "ا" },
    { name: "ا".repeat(61) },
    { email: "bad" },
    { password: "Short1", confirmPassword: "Short1" },
    { password: "12345678", confirmPassword: "12345678" },
    { password: "abcdefgh", confirmPassword: "abcdefgh" },
    { confirmPassword: "Different123" },
    { password: "آ".repeat(36) + "1", confirmPassword: "آ".repeat(36) + "1" },
  ])("rejects invalid registration %j", (patch) =>
    expectInvalid(registerSchema, { ...registration, ...patch }),
  );
  it("preserves password characters and accepts the byte limit", () => {
    const password = "A".repeat(71) + "1";
    expect(
      registerSchema.parse({
        ...registration,
        password,
        confirmPassword: password,
      }).password,
    ).toBe(password);
  });
});

describe("product and query input", () => {
  it("normalizes Persian and Arabic numeric fields and safe boolean strings", () => {
    const product = productSchema.parse({
      ...productInput,
      price: "۱۵۰۰۰۰",
      compareAtPrice: "٢٠٠٠٠٠",
      stock: "۵",
      sku: " ",
      isActive: "false",
      soldCount: 99,
    });
    expect(product).toMatchObject({
      price: 150000,
      compareAtPrice: 200000,
      stock: 5,
      isActive: false,
      attributes: [],
      isFeatured: false,
    });
    expect(product.sku).toBeUndefined();
    expect(product).not.toHaveProperty("soldCount");
    expect(
      productSchema.parse({ ...productInput, compareAtPrice: "" })
        .compareAtPrice,
    ).toBeUndefined();
  });
  it.each([
    { title: "اب" },
    { title: "ا".repeat(151) },
    { description: " " },
    { price: -1 },
    { price: 1.5 },
    { price: true },
    { price: null },
    { price: "" },
    { price: "1e4" },
    { price: Number.MAX_SAFE_INTEGER + 1 },
    { stock: -1 },
    { stock: 1.1 },
    { compareAtPrice: 150000 },
    { compareAtPrice: 140000 },
    { images: [] },
    { images: Array(9).fill("https://example.com/a.png") },
    { images: ["javascript:alert(1)"] },
    { images: ["//evil.example/image.png"] },
    { images: ["/images/../private.png"] },
    { category: "invalid" },
    { category: { $ne: null } },
    { attributes: [{ key: " ", value: "a" }] },
    { isActive: "anything" },
    { slug: "bad slug" },
  ])("rejects invalid product %j", (patch) =>
    expectInvalid(productSchema, { ...productInput, ...patch }),
  );
  it("accepts positive price, zero stock, eight images, and Persian slugs", () => {
    expect(
      productSchema.safeParse({
        ...productInput,
        price: 1,
        stock: 0,
        images: Array(8).fill("https://example.com/a.png"),
      }).success,
    ).toBe(true);
    expect(
      productSchema.safeParse({
        ...productInput,
        images: ["/images/products/refrigerator.png"],
      }).success,
    ).toBe(true);
  });
  it("validates pagination, sort and price bounds", () => {
    expect(productQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 12,
      sort: "newest",
    });
    expect(
      productQuerySchema.parse({
        page: "۲",
        limit: "٤٨",
        minPrice: "۰",
        maxPrice: "۱۰",
        inStock: "false",
      }),
    ).toMatchObject({
      page: 2,
      limit: 48,
      minPrice: 0,
      maxPrice: 10,
      inStock: false,
    });
    expectInvalid(productQuerySchema, { minPrice: 20, maxPrice: 10 });
    expectInvalid(productQuerySchema, { sort: "injected" });
    expectInvalid(productQuerySchema, { q: { $regex: ".*" } });
  });
});

describe("address input", () => {
  it("normalizes phone and postal digits", () => {
    expect(
      addressSchema.parse({
        ...addressInput,
        mobile: "۰۹۱۲۳۴۵۶۷۸۹",
        postalCode: "١٢٣٤٥٦٧٨٩٠",
        isDefault: "false",
      }),
    ).toMatchObject({
      mobile: "09123456789",
      postalCode: "1234567890",
      isDefault: false,
    });
  });
  it.each([
    { title: " " },
    { recipientName: "" },
    { recipientName: "Ali Rezaei" },
    { recipientName: "علی رضایی۱۲" },
    { recipientName: "علی@رضایی" },
    { recipientName: "\u200c" },
    { province: "" },
    { province: "استان نامعتبر" },
    { city: "" },
    { city: "شیراز" },
    { addressLine: " " },
    { mobile: "08123456789" },
    { mobile: "0912345678" },
    { postalCode: "123456789" },
    { postalCode: "12345678901" },
    { postalCode: 1234567890 },
  ])("rejects invalid address %j", (patch) =>
    expectInvalid(addressSchema, { ...addressInput, ...patch }),
  );
});

describe("category, cart and order input", () => {
  it("accepts category defaults and blank optional values", () => {
    expect(
      categorySchema.parse({ name: "کتاب", parent: "", image: "", order: "۲" }),
    ).toMatchObject({
      name: "کتاب",
      order: 2,
      isActive: true,
      parent: undefined,
      image: undefined,
    });
    expectInvalid(categorySchema, { name: " ", parent: "bad" });
    expectInvalid(categorySchema, {
      name: "کتاب",
      image: "file:///private",
      order: -1,
    });
  });
  it("accepts cart boundary quantities and removes client prices", () => {
    expect(
      cartItemSchema.parse({ product: objectId, quantity: "۱۰", price: 1 }),
    ).toEqual({ product: objectId, quantity: 10 });
    expect(
      cartItemSchema.parse({ product: objectId, quantity: "١" }).quantity,
    ).toBe(1);
    expect(removeCartItemSchema.parse({ product: objectId })).toEqual({
      product: objectId,
    });
    expect(guestIdSchema.parse(guestId)).toBe(guestId);
    expectInvalid(guestIdSchema, "invalid");
  });
  it.each([0, 11, -1, 1.5, null, "", true])(
    "rejects invalid quantity %s",
    (quantity) =>
      expectInvalid(cartItemSchema, { product: objectId, quantity }),
  );
  it("takes only address and note from checkout input", () => {
    expect(
      orderSchema.parse({
        addressId: objectId,
        note: "یادداشت",
        user: objectId,
        total: 1,
        status: "paid",
        payment: {},
      }),
    ).toEqual({ addressId: objectId, note: "یادداشت" });
    expect(
      orderSchema.safeParse({ addressId: objectId, note: "ا".repeat(500) })
        .success,
    ).toBe(true);
    expectInvalid(orderSchema, { addressId: objectId, note: "ا".repeat(501) });
    expectInvalid(orderSchema, { addressId: "bad" });
    expect(
      updateOrderStatusSchema.parse({ id: objectId, status: "shipped" }).status,
    ).toBe("shipped");
    expectInvalid(updateOrderStatusSchema, { id: objectId, status: "paid" });
    expect(orderQuerySchema.parse({ status: "pending" })).toEqual({
      status: "pending",
      page: 1,
      limit: 12,
    });
  });
});

describe("shared validation", () => {
  it.each([
    { page: 0 },
    { page: 1.5 },
    { limit: 49 },
    { limit: "" },
    { page: [] },
  ])("rejects invalid pagination %j", (input) =>
    expectInvalid(paginationSchema, input),
  );
  it.each(["507f1f77bcf86cd79943901", "z".repeat(24), { $gt: "" }, null])(
    "rejects invalid identifier %j",
    (input) => expectInvalid(objectIdSchema, input),
  );
  it.each(["false", "off", false])("preserves false boolean %s", (input) =>
    expect(booleanSchema.parse(input)).toBe(false),
  );
  it.each([
    loginSchema,
    registerSchema,
    productSchema,
    addressSchema,
    categorySchema,
    cartItemSchema,
    orderSchema,
  ])("uses Persian errors for missing input", (schema) => {
    expectInvalid(schema, undefined);
    expectInvalid(schema, {});
  });
});
