import { describe, expect, it, vi } from "vitest";
import mongoose, { Types } from "mongoose";

vi.mock("server-only", () => ({}));
import { Brand } from "@/models/brand";
import { Product } from "@/models/product";
import { productInput } from "./fixtures";

const brandInput = { name: "سامسونگ", slug: "سامسونگ" };

describe("brand validation", () => {
  it("applies defaults and normalizes text", async () => {
    const brand = new Brand({
      name: " سامسونگ ",
      slug: " samsung ",
      description: " توضیح برند ",
      country: " کره جنوبی ",
      logo: " ",
      website: null,
    });
    await expect(brand.validate()).resolves.toBeUndefined();
    expect(brand).toMatchObject({
      name: "سامسونگ",
      slug: "samsung",
      description: "توضیح برند",
      country: "کره جنوبی",
      isActive: true,
      isFeatured: false,
      order: 0,
    });
    expect(brand.logo).toBeUndefined();
    expect(brand.website).toBeUndefined();
  });

  it.each([
    { name: undefined },
    { name: " " },
    { slug: undefined },
    { slug: " " },
    { slug: "invalid slug" },
    { slug: "-invalid" },
    { logo: "invalid" },
    { logo: "//example.com/logo.png" },
    { logo: "/images/../logo.png" },
    { website: "/website" },
    { website: "invalid" },
    { website: "javascript:alert(1)" },
    { website: "ftp://example.com" },
    { order: -1 },
    { order: 1.5 },
    { order: Number.MAX_SAFE_INTEGER + 1 },
    { isActive: null },
    { isFeatured: null },
  ])("rejects invalid fields %j", async (patch) => {
    await expect(
      new Brand({ ...brandInput, ...patch }).validate(),
    ).rejects.toBeInstanceOf(mongoose.Error.ValidationError);
  });

  it.each([
    { logo: "/images/brands/samsung.svg", website: "https://example.com" },
    { logo: "https://example.com/logo.png", website: "http://example.com" },
    { logo: null, website: " ", description: " ", country: null },
  ])("accepts valid optional fields %j", async (patch) => {
    await expect(
      new Brand({ ...brandInput, ...patch }).validate(),
    ).resolves.toBeUndefined();
  });

  it("reuses the registered brand model across module reload", async () => {
    vi.resetModules();
    expect((await import("@/models/brand")).Brand).toBe(Brand);
  });
});

describe("product brand validation", () => {
  it("keeps brand optional and preserves legacy brand attributes", async () => {
    const product = new Product({
      ...productInput,
      attributes: [{ key: "برند", value: "سامسونگ" }],
    });
    await expect(product.validate()).resolves.toBeUndefined();
    expect(product.brand).toBeUndefined();
    expect(product.attributes[0]).toMatchObject({
      key: "برند",
      value: "سامسونگ",
    });
  });

  it("accepts an ObjectId brand and serializes it as a string", async () => {
    const brand = new Types.ObjectId();
    const product = new Product({ ...productInput, brand });
    await expect(product.validate()).resolves.toBeUndefined();
    expect(product.brand).toEqual(brand);
    expect(product.toJSON()).toMatchObject({ brand: brand.toHexString() });
    expect(Product.schema.path("brand").options.ref).toBe("Brand");
  });

  it("rejects an invalid brand reference", async () => {
    await expect(
      new Product({ ...productInput, brand: "invalid" }).validate(),
    ).rejects.toBeInstanceOf(mongoose.Error.ValidationError);
  });
});
