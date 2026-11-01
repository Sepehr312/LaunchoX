import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { startTestMongo } from "./mongo-server";
import { productInput } from "./fixtures";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn(async () => mongoose) }));
import { Brand } from "@/models/brand";
import { Category } from "@/models/category";
import { Product } from "@/models/product";
import { getStoreBrandBySlug, updateBrand } from "@/services/brand.service";
import {
  getBrandCategories,
  getProductFilterOptions,
  listBrandProducts,
  listProducts,
} from "@/services/product.service";
import { productQuerySchema } from "@/validations/product";

let server: Awaited<ReturnType<typeof startTestMongo>>;
beforeAll(async () => {
  server = await startTestMongo();
  await mongoose.connect(server.uri, { dbName: "launchox_brand_detail_test" });
  await Promise.all([Brand.init(), Category.init(), Product.init()]);
}, 180000);
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});
beforeEach(async () => {
  await Promise.all([
    Brand.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
  ]);
  const [brand, other] = await Brand.create([
    {
      name: "سامسونگ",
      slug: "samsung",
      logo: "/samsung.svg",
      description: "توضیح واقعی برند",
    },
    { name: "ال‌جی", slug: "lg" },
  ]);
  const [category, empty, hidden] = await Category.create([
    { name: "یخچال", slug: "fridges" },
    { name: "بدون محصول", slug: "empty" },
    { name: "پنهان", slug: "hidden", isActive: false },
  ]);
  await Product.create([
    {
      ...productInput,
      slug: "first",
      category: category._id,
      brand: brand._id,
      price: 100,
      compareAtPrice: 200,
      stock: 2,
      attributes: [
        { key: "برند", value: "قدیمی" },
        { key: "رده انرژی", value: "A+" },
        { key: "ظرفیت", value: "۵۰۰ لیتر" },
      ],
    },
    {
      ...productInput,
      slug: "second",
      category: category._id,
      brand: brand._id,
      price: 300,
      stock: 0,
    },
    {
      ...productInput,
      slug: "inactive",
      category: empty._id,
      brand: brand._id,
      isActive: false,
    },
    {
      ...productInput,
      slug: "hidden-category",
      category: hidden._id,
      brand: brand._id,
      price: 400,
    },
    {
      ...productInput,
      slug: "other",
      category: empty._id,
      brand: other._id,
      price: 9999,
      attributes: [
        { key: "برند", value: "سامسونگ" },
        { key: "رده انرژی", value: "B" },
      ],
    },
    {
      ...productInput,
      slug: "legacy",
      category: category._id,
      attributes: [{ key: "برند", value: "قدیمی" }],
    },
  ]);
});

it("returns only public fields, real counts, metadata data and valid populated categories", async () => {
  const brand = await getStoreBrandBySlug("samsung");
  expect(brand).toEqual({
    id: expect.any(String),
    name: "سامسونگ",
    slug: "samsung",
    logo: "/samsung.svg",
    description: "توضیح واقعی برند",
    productCount: 3,
  });
  expect(
    (await getBrandCategories(brand!.id)).map((category) => category.slug),
  ).toEqual(["fridges"]);
  expect(await getProductFilterOptions(brand!.id)).toEqual({
    brands: [],
    energies: ["A+"],
    maxPrice: 400,
  });
  expect(JSON.parse(JSON.stringify(brand))).toEqual(brand);
});

it("ignores hostile brand selectors and applies price, category, stock, energy and capacity before pagination", async () => {
  const category = await Category.findOne({ slug: "fridges" }).orFail();
  const result = await listBrandProducts("samsung", {
    brandSlug: "lg",
    brands: ["ال‌جی"],
    category: String(category._id),
    minPrice: "50",
    maxPrice: "200",
    inStock: "true",
    energies: "A+",
    capacity: "medium",
    sort: "price_asc",
    limit: "1",
  });
  expect(result).toMatchObject({ total: 1, totalPages: 1 });
  expect(result.items.map((product) => product.slug)).toEqual(["first"]);
  const first = await listBrandProducts("samsung", {
    sort: "price_desc",
    limit: "1",
  });
  const second = await listBrandProducts("samsung", {
    sort: "price_desc",
    limit: "1",
    page: "2",
    brandSlug: "lg",
  });
  expect(first.items[0].slug).toBe("hidden-category");
  expect(second.items[0].slug).toBe("second");
  expect(first.total).toBe(3);
  expect(
    (
      await listBrandProducts("samsung", {
        discounted: "true",
        sort: "discount",
      })
    ).items.map((product) => product.slug),
  ).toEqual(["first"]);
  expect(
    (
      await listBrandProducts("samsung", {
        category: String(
          (await Category.findOne({ slug: "empty" }).orFail())._id,
        ),
      })
    ).total,
  ).toBe(0);
  await expect(
    listBrandProducts("samsung", { minPrice: "invalid" }),
  ).rejects.toMatchObject({ code: "VALIDATION" });
});

it("uses current reference names after rename and excludes unassigned legacy filtering", async () => {
  const brand = await getStoreBrandBySlug("samsung");
  await updateBrand(brand!.id, { name: "نام جدید", slug: "samsung" });
  const result = await listProducts(
    productQuerySchema.parse({ brands: ["نام جدید"] }),
  );
  expect(result.total).toBe(3);
  expect(
    result.items.flatMap((product) =>
      product.attributes
        .filter((attribute) => attribute.key === "برند")
        .map((attribute) => attribute.value),
    ),
  ).toEqual(["نام جدید", "نام جدید", "نام جدید"]);
  const options = await getProductFilterOptions();
  expect(options.brands).toContain("نام جدید");
  expect(options.brands).not.toContain("سامسونگ");
  expect(
    (await listProducts(productQuerySchema.parse({ brands: ["سامسونگ"] })))
      .total,
  ).toBe(0);
  expect(
    (
      await listProducts(productQuerySchema.parse({ brands: ["قدیمی"] }))
    ).items.map((product) => product.slug),
  ).toEqual([]);
  expect((await listBrandProducts("samsung", {})).total).toBe(3);
});

it("rejects invalid, missing and inactive slugs on every load and returns an empty brand", async () => {
  const persian = await Brand.create({
    name: "برند فارسی",
    slug: "برند-فارسی",
  });
  expect(
    (await getStoreBrandBySlug(encodeURIComponent(persian.slug)))?.id,
  ).toBe(String(persian._id));
  expect(await getStoreBrandBySlug("%E0%A4%A")).toBeNull();
  expect(await getStoreBrandBySlug("%2E%2E%2Fadmin")).toBeNull();
  expect(await getStoreBrandBySlug("../admin")).toBeNull();
  expect(await getStoreBrandBySlug("missing")).toBeNull();
  const brand = await getStoreBrandBySlug("samsung");
  await updateBrand(brand!.id, {
    name: "سامسونگ",
    slug: "samsung",
    isActive: false,
  });
  expect(await getStoreBrandBySlug("samsung")).toBeNull();
  await expect(
    listBrandProducts("samsung", { page: "2" }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect(await Product.countDocuments({ brand: brand!.id })).toBe(4);
  await Brand.create({ name: "خالی", slug: "empty" });
  expect((await listBrandProducts("empty", {})).total).toBe(0);
});
