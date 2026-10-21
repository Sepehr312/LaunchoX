import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { startTestMongo } from "./mongo-server";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn(async () => mongoose) }));

import { Category } from "@/models/category";
import { Product } from "@/models/product";
import { Brand } from "@/models/brand";
import {
  getProductFilterOptions,
  listProducts,
} from "@/services/product.service";
import { parseProductQuery } from "@/lib/product-query";

let server: Awaited<ReturnType<typeof startTestMongo>>;
beforeAll(async () => {
  server = await startTestMongo();
  await mongoose.connect(server.uri, {
    dbName: "launchox_catalog_filters_test",
  });
  await Promise.all([Category.init(), Product.init()]);
}, 180000);
beforeEach(async () => {
  await Promise.all([
    Product.deleteMany({}),
    Category.deleteMany({}),
    Brand.deleteMany({}),
  ]);
  const brands = await Brand.create([
    { name: "ال‌جی", slug: "lg" },
    { name: "سامسونگ", slug: "samsung" },
  ]);
  const category = await Category.create({ name: "یخچال", slug: "fridges" });
  const capacities = [
    "۳۹۹ لیتر",
    "۴۰۰ لیتر",
    "600 L",
    "٦٠١ لیتر",
    "۱٬۲۰۰ لیتر",
    "نامشخص",
    "",
    "۳۰۰ لیتر",
  ];
  await Product.create(
    capacities.map((capacity, index) => ({
      title: `یخچال آزمون ${index}`,
      slug: `fridge-${index}`,
      description: "محصول آزمون",
      price: index === 0 ? 800 : 2000 + index * 100,
      ...(index === 0
        ? { compareAtPrice: 1000 }
        : index === 1
          ? { compareAtPrice: 3000 }
          : {}),
      category: category._id,
      brand: brands[index % 2]._id,
      stock: index === 1 ? 0 : 3,
      images: ["/test.jpg"],
      isActive: index !== 7,
      attributes: [
        { key: "برند", value: index % 2 ? "سامسونگ" : "ال‌جی" },
        { key: "رده انرژی", value: index < 3 ? "A+" : "B" },
        ...(capacity ? [{ key: "ظرفیت", value: capacity }] : []),
        { key: "رنگ", value: "برند جعلی" },
      ],
    })),
  );
});
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});

async function query(values: Record<string, string | string[]>) {
  const parsed = parseProductQuery(values);
  if (!parsed.success) throw new Error(parsed.error.message);
  return listProducts(parsed.data);
}

it("combines multi-brand and energy filters with category, price and stock before pagination", async () => {
  const category = await Category.findOne().orFail();
  const result = await query({
    brands: ["ال‌جی", "سامسونگ"],
    energies: ["A+", "B"],
    capacity: "medium",
    category: category.id,
    minPrice: "۲۰۰۰",
    maxPrice: "۳۰۰۰",
    inStock: "true",
    limit: "1",
    sort: "price_asc",
  });
  expect(result).toMatchObject({ total: 1, totalPages: 1 });
  expect(result.items[0].slug).toBe("fridge-2");
  expect(
    (await query({ brands: "ال‌جی", energies: "A+" })).items
      .map((item) => item.slug)
      .sort(),
  ).toEqual(["fridge-0", "fridge-2"]);
  expect((await query({ brands: "برند جعلی" })).total).toBe(0);
});

it("handles capacity boundaries, Persian and Arabic digits, thousands separators and missing values", async () => {
  expect(
    (await query({ capacity: "small" })).items.map((item) => item.slug),
  ).toEqual(["fridge-0"]);
  expect(
    (await query({ capacity: "medium", sort: "price_asc" })).items.map(
      (item) => item.slug,
    ),
  ).toEqual(["fridge-1", "fridge-2"]);
  expect(
    (await query({ capacity: "large", sort: "price_asc" })).items.map(
      (item) => item.slug,
    ),
  ).toEqual(["fridge-3", "fridge-4"]);
  expect((await query({ capacity: "all" })).total).toBe(7);
});

it("filters discounts and sorts by percentage rather than absolute savings across pages", async () => {
  const first = await query({
    discounted: "true",
    sort: "discount",
    limit: "1",
  });
  const second = await query({
    discounted: "true",
    sort: "discount",
    limit: "1",
    page: "2",
  });
  expect(first).toMatchObject({ total: 2, totalPages: 2 });
  expect(first.items[0].slug).toBe("fridge-1");
  expect(second.items[0].slug).toBe("fridge-0");
  expect(
    (
      await query({
        discounted: "true",
        inStock: "true",
        brands: "ال‌جی",
        capacity: "small",
      })
    ).total,
  ).toBe(1);
  expect((await query({ discounted: "false" })).total).toBe(7);
  expect(JSON.parse(JSON.stringify(first))).toEqual(first);
});

it("returns actual brand and energy options and the highest active price", async () => {
  const options = await getProductFilterOptions();
  expect(options.brands.sort()).toEqual(["ال‌جی", "سامسونگ"].sort());
  expect(options.energies).toEqual(["A+", "B"]);
  expect(options.maxPrice).toBe(2600);
});

it("rejects malformed capacity, boolean and oversized multi-value filters", () => {
  for (const params of [
    { capacity: "huge" },
    { discounted: "yes" },
    { brands: ["x".repeat(101)] },
    { energies: Array(51).fill("A") as string[] },
  ]) {
    expect(parseProductQuery(params).success).toBe(false);
  }
});
