import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import mongoose, { Types } from "mongoose";
import { z } from "zod";
import { startTestMongo } from "./mongo-server";
import { productInput } from "./fixtures";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn(async () => mongoose) }));
import { connectDB } from "@/lib/db";
import { Brand } from "@/models/brand";
import { Product } from "@/models/product";
import { Category } from "@/models/category";
import {
  createProduct,
  updateProduct,
  getProductAdmin,
  listProducts,
} from "@/services/product.service";
import {
  createBrand,
  deleteBrand,
  getBrand,
  listBrands,
  listStoreBrands,
  updateBrand,
} from "@/services/brand.service";
import { productQuerySchema } from "@/validations/product";

let server: Awaited<ReturnType<typeof startTestMongo>> | undefined;

it("publishes only active brands with active reference-based counts and public fields", async () => {
  const brand = await createBrand({
    name: "سامسونگ",
    slug: "samsung",
    logo: "/images/samsung.svg",
  });
  await createBrand({ name: "Hidden", isActive: false });
  const empty = await createBrand({ name: "Empty" });
  await Product.create([
    { ...productInput, slug: "linked", brand: brand.id, isActive: true },
    { ...productInput, slug: "inactive", brand: brand.id, isActive: false },
    {
      ...productInput,
      slug: "legacy",
      attributes: [{ key: "برند", value: brand.name }],
      isActive: true,
    },
  ]);
  const brands = await listStoreBrands();
  expect(brands).toHaveLength(2);
  expect(brands.find((item) => item.id === brand.id)).toEqual({
    id: brand.id,
    name: brand.name,
    slug: "samsung",
    logo: brand.logo,
    productCount: 1,
  });
  expect(brands.find((item) => item.id === empty.id)?.productCount).toBe(0);
  expect(brands[0]).not.toHaveProperty("isFeatured");
  expect(brands[0]).not.toHaveProperty("website");
});

it("preserves product links and counts after renaming and excludes inactive or missing slugs", async () => {
  const category = await Category.create({ name: "Rename", slug: "rename" });
  const brand = await createBrand({ name: "Old", slug: "stable" });
  const product = await Product.create({
    ...productInput,
    category: category._id,
    brand: brand.id,
  });
  const query = productQuerySchema.parse({ brandSlug: "stable" });
  expect((await listProducts(query)).items.map((item) => item.id)).toEqual([
    String(product._id),
  ]);
  await updateBrand(brand.id, { name: "New", slug: "stable" });
  expect((await listProducts(query)).items.map((item) => item.id)).toEqual([
    String(product._id),
  ]);
  expect((await listStoreBrands())[0]).toMatchObject({
    name: "New",
    productCount: 1,
  });
  await updateBrand(brand.id, { name: "New", slug: "stable", isActive: false });
  expect(await listStoreBrands()).toEqual([]);
  expect((await listProducts(query)).total).toBe(0);
  expect(
    (await listProducts(productQuerySchema.parse({ brandSlug: "missing" })))
      .total,
  ).toBe(0);
  expect((await Product.findById(product._id).orFail()).brand?.toString()).toBe(
    brand.id,
  );
});

it("blocks new inactive assignments while preserving existing assignments on edits", async () => {
  const category = await Category.create({
    name: "Inactive",
    slug: "inactive-brand",
  });
  const brand = await createBrand({ name: "Inactive brand", isActive: false });
  const input = {
    ...productInput,
    category: String(category._id),
    attributes: [],
    isActive: true,
    isFeatured: false,
  };
  await expect(createProduct({ ...input, brand: brand.id })).rejects.toThrow(
    "برند غیرفعال",
  );
  const product = await Product.create({ ...input, brand: brand.id });
  await expect(
    updateProduct(String(product._id), { ...input, brand: brand.id }),
  ).resolves.toBeDefined();
  const other = await Product.create({ ...input, slug: "other-product" });
  await expect(
    updateProduct(String(other._id), {
      ...input,
      slug: "other-product",
      brand: brand.id,
    }),
  ).rejects.toThrow("برند غیرفعال");
  expect((await getProductAdmin(String(product._id)))?.brand).toBe(brand.id);
});

it("links, switches and clears the product brand and rejects missing brands", async () => {
  const category = await Category.create({
    name: "Admin brand test",
    slug: "admin-brand-test",
  });
  const first = await createBrand({ name: "First" });
  const second = await createBrand({ name: "Second" });
  const input = {
    ...productInput,
    category: String(category._id),
    attributes: [],
    isActive: true,
    isFeatured: false,
  };
  const product = await createProduct({ ...input, brand: first.id });
  expect((await getProductAdmin(product.id))?.brand).toBe(first.id);
  await expect(deleteBrand(first.id)).rejects.toThrow("برند دارای محصول");
  await updateProduct(product.id, { ...input, brand: second.id });
  expect((await getProductAdmin(product.id))?.brand).toBe(second.id);
  await expect(
    updateProduct(product.id, {
      ...input,
      brand: new Types.ObjectId().toString(),
    }),
  ).rejects.toThrow("برند پیدا نشد");
  expect((await getProductAdmin(product.id))?.brand).toBe(second.id);
  await updateProduct(product.id, { ...input, brand: null });
  expect((await getProductAdmin(product.id))?.brand).toBeUndefined();
  await expect(deleteBrand(second.id)).resolves.toBeUndefined();
});
beforeAll(async () => {
  server = await startTestMongo();
  await mongoose.connect(server.uri, {
    dbName: "launchox_brand_service_test",
    bufferCommands: false,
  });
  await Promise.all([Brand.init(), Product.init()]);
}, 180000);
beforeEach(async () => {
  await Promise.all([Brand.deleteMany({}), Product.deleteMany({})]);
  vi.clearAllMocks();
});
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});

it("returns an empty list then lists all brands in order including inactive ones", async () => {
  expect(await listBrands()).toEqual([]);
  const last = await createBrand({ name: "آخر", order: 2 });
  const second = await createBrand({ name: "Beta", order: 1 });
  const first = await createBrand({ name: "Alpha", order: 1, isActive: false });
  expect((await listBrands()).map((brand) => brand.id)).toEqual([
    first.id,
    second.id,
    last.id,
  ]);
  expect(await getBrand(first.id)).toEqual(first);
  expect(first).toMatchObject({
    slug: "alpha",
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
  });
  expect(first).not.toHaveProperty("_id");
  expect(first).not.toHaveProperty("__v");
  expect(JSON.parse(JSON.stringify(first))).toEqual(first);
});

it("generates unique slugs and handles duplicate names and explicit slugs", async () => {
  const first = await createBrand({ name: "Brand!" });
  const second = await createBrand({ name: "Brand?" });
  expect([first.slug, second.slug]).toEqual(["brand", "brand-2"]);
  await expect(
    createBrand({ name: " Brand! ", slug: "unique" }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(
    createBrand({ name: "Other", slug: first.slug }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(
    updateBrand(second.id, { name: first.name }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(
    updateBrand(second.id, { name: second.name, slug: first.slug }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect((await getBrand(second.id))?.slug).toBe(second.slug);
});

it("updates all fields, clears optional fields and excludes itself from slug collisions", async () => {
  const brand = await createBrand({ name: "Brand" });
  const updated = await updateBrand(brand.id, {
    name: "Brand",
    logo: "/images/brand.svg",
    description: " توضیح ",
    country: "ایران",
    website: "https://example.com",
    isActive: false,
    isFeatured: true,
    order: "۳",
  });
  expect(updated).toMatchObject({
    slug: "brand",
    logo: "/images/brand.svg",
    description: "توضیح",
    country: "ایران",
    website: "https://example.com",
    isActive: false,
    isFeatured: true,
    order: 3,
  });
  const cleared = await updateBrand(brand.id, {
    name: "Changed",
    logo: " ",
    website: "",
  });
  expect(cleared.slug).toBe("changed");
  for (const field of ["logo", "description", "country", "website"])
    expect(cleared).not.toHaveProperty(field);
  expect(await getBrand(brand.id)).toEqual(cleared);
});

it("reports missing brands and deletes an unlinked brand", async () => {
  const missing = new Types.ObjectId().toHexString();
  expect(await getBrand(missing)).toBeNull();
  await expect(updateBrand(missing, { name: "Missing" })).rejects.toMatchObject(
    { code: "NOT_FOUND" },
  );
  await expect(deleteBrand(missing)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  const brand = await createBrand({ name: "Delete" });
  await deleteBrand(brand.id);
  expect(await getBrand(brand.id)).toBeNull();
});

it.each([true, false])(
  "blocks deletion with an active=%s product but permits deactivation",
  async (isActive) => {
    const brand = await createBrand({ name: "Linked" });
    const product = await Product.create({
      ...productInput,
      brand: brand.id,
      isActive,
      attributes: [{ key: "برند", value: "قدیمی" }],
    });
    const before = product.toObject();
    await expect(deleteBrand(brand.id)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(await getBrand(brand.id)).not.toBeNull();
    const inactive = await updateBrand(brand.id, {
      name: brand.name,
      isActive: false,
    });
    expect(inactive.isActive).toBe(false);
    expect((await Product.findById(product._id).orFail()).toObject()).toEqual(
      before,
    );
  },
);

it("does not infer dependencies from legacy attributes", async () => {
  const brand = await createBrand({ name: "Legacy" });
  const product = await Product.create({
    ...productInput,
    attributes: [{ key: "برند", value: brand.name }],
  });
  await deleteBrand(brand.id);
  expect(await Product.exists({ _id: product._id })).not.toBeNull();
});

it("validates every external input before connecting to the database", async () => {
  await expect(createBrand({ name: " " })).rejects.toBeInstanceOf(z.ZodError);
  await expect(getBrand({ $ne: null })).rejects.toBeInstanceOf(z.ZodError);
  await expect(deleteBrand("bad")).rejects.toBeInstanceOf(z.ZodError);
  await expect(updateBrand("bad", { name: "Valid" })).rejects.toBeInstanceOf(
    z.ZodError,
  );
  await expect(
    updateBrand(new Types.ObjectId().toHexString(), { name: " " }),
  ).rejects.toBeInstanceOf(z.ZodError);
  expect(connectDB).not.toHaveBeenCalled();
});
