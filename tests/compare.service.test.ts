import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import mongoose, { Types } from "mongoose";
import { startTestMongo } from "./mongo-server";
import { productInput } from "./fixtures";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn(async () => mongoose) }));
import { connectDB } from "@/lib/db";
import { Product } from "@/models/product";
import { Category } from "@/models/category";
import { Brand } from "@/models/brand";
import {
  getComparisonProducts,
  searchComparisonProducts,
} from "@/services/product.service";
import { searchCompareAction } from "@/actions/compare.actions";
import { COMPARE_PAGE_LIMIT, COMPARE_PAGE_SIZE } from "@/validations/compare";

let server: Awaited<ReturnType<typeof startTestMongo>>;
beforeAll(async () => {
  server = await startTestMongo();
  await mongoose.connect(server.uri, { dbName: "comparison_security_test" });
  await Promise.all([Product.init(), Category.init(), Brand.init()]);
}, 180000);
beforeEach(async () => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  await Promise.all([
    Product.deleteMany({}),
    Category.deleteMany({}),
    Brand.deleteMany({}),
  ]);
});
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});

async function setup(count = 1) {
  const category = await Category.create({
    name: "دسته آزمون",
    slug: "test-category",
  });
  const brand = await Brand.create({ name: "برند آزمون", slug: "test-brand" });
  return Product.create(
    Array.from({ length: count }, (_, i) => ({
      ...productInput,
      category: category._id,
      brand: brand._id,
      slug: `test-${i}`,
      attributes: [{ key: "ظرفیت", value: "۶۰۰ لیتر" }],
    })),
  );
}

it("returns ordered public DTOs, removes duplicate IDs and preserves unified brands and attributes", async () => {
  const products = await setup(3);
  const result = await getComparisonProducts([
    products[2].id.toUpperCase(),
    products[0].id,
    products[2].id,
  ]);
  expect(result.map((item) => item.id)).toEqual([
    products[2].id,
    products[0].id,
  ]);
  expect(result[0].attributes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ key: "برند", value: "برند آزمون" }),
      expect.objectContaining({ key: "ظرفیت", value: "۶۰۰ لیتر" }),
    ]),
  );
  for (const item of result) {
    expect(item).not.toHaveProperty("description");
    expect(item).not.toHaveProperty("isActive");
    expect(item).not.toHaveProperty("soldCount");
    expect(item).not.toHaveProperty("_id");
    expect(item).not.toHaveProperty("save");
  }
});

it("excludes inactive and deleted products from guest action and selected IDs without writing data", async () => {
  const [active, inactive, deleted] = await setup(3);
  await Product.updateOne({ _id: inactive._id }, { isActive: false });
  await Product.deleteOne({ _id: deleted._id });
  const snapshot = await Product.find().lean();
  const selection = await getComparisonProducts([
    inactive.id,
    deleted.id,
    active.id,
    String(new Types.ObjectId()),
  ]);
  expect(selection.map((item) => item.id)).toEqual([active.id]);
  const result = await searchCompareAction({});
  expect(result.items.map((item) => item.id)).toEqual([active.id]);
  expect(await Product.find().lean()).toEqual(snapshot);
});

it("searches the current Brand reference and treats regex operators literally", async () => {
  const [product] = await setup();
  expect(
    (await searchCompareAction({ q: "برند آزمون" })).items.map(
      (item) => item.id,
    ),
  ).toEqual([product.id]);
  expect(await searchComparisonProducts({ q: ".*" })).toEqual({
    items: [],
    totalPages: 0,
  });
});

it("validates at the service boundary before connecting to the database", async () => {
  await expect(
    getComparisonProducts(
      Array(5)
        .fill(0)
        .map(() => String(new Types.ObjectId())),
    ),
  ).rejects.toThrow();
  await expect(getComparisonProducts([{ $ne: null }])).rejects.toThrow();
  await expect(searchComparisonProducts({ page: 10000 })).rejects.toThrow();
  expect(connectDB).not.toHaveBeenCalled();
  expect(await getComparisonProducts([])).toEqual([]);
  expect(connectDB).not.toHaveBeenCalled();
});

it("paginates stable results in sets of twelve without duplicates", async () => {
  await setup(COMPARE_PAGE_SIZE + 1);
  const first = await searchComparisonProducts({ page: 1 });
  const second = await searchComparisonProducts({ page: 2 });
  expect(first.totalPages).toBe(2);
  expect(first.items).toHaveLength(COMPARE_PAGE_SIZE);
  expect(second.items).toHaveLength(1);
  expect(
    new Set([...first.items, ...second.items].map((item) => item.id)).size,
  ).toBe(COMPARE_PAGE_SIZE + 1);
});

it("avoids product fetches on empty or out-of-range result pages", async () => {
  const find = vi.spyOn(Product, "find");
  expect(await searchComparisonProducts({})).toEqual({
    items: [],
    totalPages: 0,
  });
  expect(find).not.toHaveBeenCalled();
  await setup();
  find.mockClear();
  expect(await searchComparisonProducts({ page: 2 })).toEqual({
    items: [],
    totalPages: 1,
  });
  expect(find).not.toHaveBeenCalled();
});

it("caps reported pages and the largest skip for a catalog beyond the browsing bound", async () => {
  await setup();
  vi.spyOn(Product, "countDocuments").mockResolvedValue(
    COMPARE_PAGE_SIZE * (COMPARE_PAGE_LIMIT + 1),
  );
  const skip = vi.spyOn(mongoose.Query.prototype, "skip");
  const result = await searchComparisonProducts({ page: COMPARE_PAGE_LIMIT });
  expect(result.totalPages).toBe(COMPARE_PAGE_LIMIT);
  expect(skip).toHaveBeenCalledWith(
    (COMPARE_PAGE_LIMIT - 1) * COMPARE_PAGE_SIZE,
  );
});
