import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import mongoose, { Types } from "mongoose";
import { startTestMongo } from "./mongo-server";
import { productInput } from "./fixtures";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn(async () => mongoose) }));
import { Brand } from "@/models/brand";
import { Category } from "@/models/category";
import { Product } from "@/models/product";
import {
  migrateProductBrands,
  parseBrandMigrationArgs,
  type BrandMigrationEvent,
} from "@/services/brand-migration.service";
import {
  createProduct,
  updateProduct,
  getComparisonProducts,
  searchComparisonProducts,
  getProductAdmin,
  listProducts,
  listBrandProducts,
} from "@/services/product.service";
import {
  getStoreBrandBySlug,
  updateBrand,
  deleteBrand,
} from "@/services/brand.service";
import {
  productSchema,
  adminProductSchema,
  productQuerySchema,
} from "@/validations/product";
import { normalizeBrandText } from "@/validations/brand-text";

let server: Awaited<ReturnType<typeof startTestMongo>>;
beforeAll(async () => {
  server = await startTestMongo();
  await mongoose.connect(server.uri, { dbName: "brand_unification_test" });
  await Promise.all([Brand.init(), Category.init(), Product.init()]);
}, 180000);
beforeEach(async () => {
  vi.restoreAllMocks();
  await Promise.all([
    Product.deleteMany({}),
    Brand.deleteMany({}),
    Category.deleteMany({}),
  ]);
});
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});
const db = () => mongoose.connection.db!;
async function setup() {
  const category = await Category.create({ name: "دسته", slug: "category" });
  const brand = await Brand.create({ name: "ال‌جی", slug: "lg" });
  const input = productSchema.parse({
    ...productInput,
    category: String(category._id),
  });
  return { category, brand, input };
}
async function legacy(value: string, brand?: Types.ObjectId) {
  return Product.create({
    ...productInput,
    slug: new Types.ObjectId().toString(),
    attributes: [
      { key: "برند", value },
      { key: "ظرفیت", value: "۴۰۰ لیتر" },
    ],
    ...(brand ? { brand } : {}),
  });
}

it("preserves optional service brands, validates references, edits and renamed comparison data", async () => {
  const { brand, input } = await setup();
  const product = await createProduct({ ...input, brand: String(brand._id) });
  expect((await getProductAdmin(product.id))?.brand).toBe(String(brand._id));
  await expect(
    createProduct({ ...input, brand: String(new Types.ObjectId()) }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(createProduct({ ...input, brand: "bad" })).rejects.toThrow();
  await updateProduct(product.id, { ...input, title: "عنوان جدید" });
  expect((await Product.findById(product.id))?.brand).toEqual(brand._id);
  await updateBrand(String(brand._id), { name: "نام جدید", slug: "lg" });
  expect(
    (await getComparisonProducts([product.id]))[0].attributes.find(
      (a) => a.key === "برند",
    )?.value,
  ).toBe("نام جدید");
  await expect(deleteBrand(String(brand._id))).rejects.toMatchObject({
    code: "CONFLICT",
  });
  const other = await Brand.create({ name: "دیگر", slug: "other" });
  await updateProduct(product.id, { ...input, brand: String(other._id) });
  expect((await getProductAdmin(product.id))?.brand).toBe(String(other._id));
  await updateProduct(product.id, { ...input, brand: null });
  expect(
    (await getComparisonProducts([product.id]))[0].attributes.some(
      (a) => a.key === "برند",
    ),
  ).toBe(false);
});

it("rejects duplicate brand attributes in services and forms while preserving historical storage", async () => {
  const { brand, input } = await setup();
  for (const key of ["برند", " برند‌ ", " BRAND "]) {
    const attributes = [{ key, value: "جعلی" }];
    expect(
      adminProductSchema.safeParse({
        ...input,
        brand: String(brand._id),
        attributes,
      }).success,
    ).toBe(false);
    await expect(createProduct({ ...input, attributes })).rejects.toThrow();
  }
  const old = await legacy("قدیمی", brand._id);
  await updateProduct(String(old._id), {
    ...input,
    slug: old.slug,
    brand: String(brand._id),
  });
  expect(
    (await Product.findById(old._id))?.attributes.find((a) => a.key === "برند")
      ?.value,
  ).toBe("قدیمی");
  expect(
    (await getProductAdmin(String(old._id)))?.attributes.find(
      (a) => a.key === "برند",
    )?.value,
  ).toBe(brand.name);
  await Brand.deleteOne({ _id: brand._id });
  expect(
    (await getComparisonProducts([String(old._id)]))[0].attributes.some(
      (a) => a.key === "برند",
    ),
  ).toBe(false);
});

it("keeps brand page, filters, combined pagination and counts consistent", async () => {
  const { brand, input, category } = await setup();
  for (let index = 0; index < 3; index++)
    await createProduct({
      ...input,
      slug: `product-${index}`,
      brand: String(brand._id),
    });
  await legacy(brand.name);
  const query = productQuerySchema.parse({
    brands: [brand.name],
    category: String(category._id),
    limit: 1,
    page: 2,
  });
  const result = await listProducts(query);
  const scoped = await listBrandProducts(brand.slug, {
    category: String(category._id),
    limit: "1",
    page: "2",
  });
  expect(result.total).toBe(3);
  expect(result.items.map((p) => p.id)).toEqual(scoped.items.map((p) => p.id));
  expect((await getStoreBrandBySlug(brand.slug))?.productCount).toBe(
    result.total,
  );
  expect(
    (await searchComparisonProducts({ q: brand.name, page: 1 })).items,
  ).toHaveLength(3);
});

it("defaults to dry run, normalizes Persian names, applies only matches and is idempotent", async () => {
  await Brand.create({ name: "کی‌وی", slug: "brand" });
  const old = await legacy(" ك ي وي ");
  const before = await Product.collection.findOne({ _id: old._id });
  const events: BrandMigrationEvent[] = [];
  const audit = await migrateProductBrands(
    db(),
    parseBrandMigrationArgs([]),
    (event) => {
      events.push(event);
    },
  );
  expect(audit).toMatchObject({
    inspected: 1,
    matched: 1,
    changed: 0,
    errors: 0,
  });
  expect(await Product.collection.findOne({ _id: old._id })).toEqual(before);
  expect(events[0].status).toBe("matched");
  expect(normalizeBrandText(" Brand ")).toBe("brand");
  const applied = await migrateProductBrands(db(), { apply: true });
  expect(applied).toMatchObject({ changed: 1, errors: 0 });
  const after = await Product.collection.findOne({ _id: old._id });
  expect({ ...after, brand: undefined }).toEqual({
    ...before,
    brand: undefined,
  });
  expect(await migrateProductBrands(db(), { apply: true })).toMatchObject({
    valid: 1,
    changed: 0,
  });
});

it("reports conflicts, unknowns, ambiguous names, deleted and malformed references without overwrites", async () => {
  const a = await Brand.create({ name: "الف", slug: "a" });
  await Brand.create([
    { name: "کی وی", slug: "one" },
    { name: "كي‌وي", slug: "two" },
    { name: "خاموش", slug: "inactive", isActive: false },
  ]);
  await legacy("دیگر", a._id);
  await legacy("نامشخص");
  await legacy("کیوی");
  await legacy("الف", new Types.ObjectId());
  await legacy("خاموش");
  const malformed = await legacy("الف");
  await db()
    .collection("products")
    .updateOne({ _id: malformed._id }, { $set: { brand: "not-an-id" } });
  const before = await Product.collection.find().toArray();
  const result = await migrateProductBrands(db(), { apply: true });
  expect(result).toMatchObject({
    conflicts: 1,
    unknown: 2,
    ambiguous: 1,
    invalidReferences: 2,
    changed: 0,
    errors: 0,
  });
  expect(await Product.collection.find().toArray()).toEqual(before);
});

it("detects concurrent edits atomically and limits work", async () => {
  const brand = await Brand.create({ name: "الف", slug: "a" });
  const old = await legacy(brand.name);
  await legacy(brand.name);
  const original = mongoose.mongo.Collection.prototype.updateOne;
  let edited = false;
  vi.spyOn(mongoose.mongo.Collection.prototype, "updateOne").mockImplementation(
    async function (this: mongoose.mongo.Collection, ...args) {
      if (!edited && this.collectionName === "products") {
        edited = true;
        await original.call(
          this,
          { _id: old._id },
          { $set: { title: "ویرایش هم‌زمان" } },
        );
      }
      return original.apply(this, args);
    },
  );
  expect(
    await migrateProductBrands(db(), { apply: true, limit: 1 }),
  ).toMatchObject({ inspected: 1, changed: 0, concurrentChanges: 1 });
  expect((await Product.findById(old._id))?.brand).toBeUndefined();
});

it("validates CLI limits and flags before opening a database", () => {
  expect(parseBrandMigrationArgs(["--limit", "2", "--apply"])).toEqual({
    limit: 2,
    apply: true,
  });
  for (const args of [
    ["--limit", "0"],
    ["--limit"],
    ["--drop"],
    ["--apply", "--apply"],
  ])
    expect(() => parseBrandMigrationArgs(args)).toThrow();
});
