import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import mongoose from "mongoose";
import { startTestMongo } from "./mongo-server";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  connectDB: vi.fn(async () => (await import("mongoose")).default),
}));

import { Category } from "@/models/category";
import { Product } from "@/models/product";
import {
  createCategory,
  deleteCategory,
  getCategoryBySlug,
  getCategoryTree,
  listCategories,
} from "@/services/category.service";
import {
  createProduct,
  deleteProduct,
  getFeaturedProducts,
  getProductBySlug,
  getRelatedProducts,
  listProducts,
  listProductsAdmin,
  updateProduct,
} from "@/services/product.service";

let server: Awaited<ReturnType<typeof startTestMongo>>;

beforeAll(async () => {
  server = await startTestMongo();
  await mongoose.connect(server.uri, { dbName: "launchox_catalog_test" });
  await Promise.all([Category.init(), Product.init()]);
}, 180000);

beforeEach(async () => {
  await Promise.all([Product.deleteMany({}), Category.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});

async function createFixtureCatalog() {
  const refrigerators = await Category.create({
    name: "یخچال",
    slug: "refrigerators",
    order: 1,
  });
  const freezers = await Category.create({
    name: "فریزر",
    slug: "freezers",
    order: 2,
  });
  const products = await Product.create([
    {
      title: "یخچال نوردیک بزرگ",
      slug: "nordic-large",
      description: "یخچال جادار با سرمایش سریع",
      price: 30000000,
      stock: 4,
      images: ["https://example.com/nordic.jpg"],
      category: refrigerators._id,
      attributes: [{ key: "ظرفیت", value: "۶۰۰ لیتر" }],
      isFeatured: true,
      soldCount: 12,
    },
    {
      title: "یخچال آرکتیک کم‌مصرف",
      slug: "arctic-efficient",
      description: "مدل اقتصادی برای خانه",
      price: 20000000,
      stock: 0,
      images: ["https://example.com/arctic.jpg"],
      category: refrigerators._id,
      soldCount: 2,
    },
    {
      title: "فریزر فروستیا",
      slug: "frostia-freezer",
      description: "انجماد عمیق و پایدار",
      price: 25000000,
      stock: 8,
      images: ["https://example.com/frostia.jpg"],
      category: freezers._id,
      isActive: false,
    },
  ]);
  return { refrigerators, freezers, products };
}

describe("public catalog queries", () => {
  it("filters inactive products and supports URL query semantics", async () => {
    const { refrigerators } = await createFixtureCatalog();
    const result = await listProducts({
      page: 1,
      limit: 1,
      category: refrigerators.id,
      q: "یخچال",
      minPrice: 19000000,
      maxPrice: 31000000,
      sort: "price_asc",
      inStock: true,
    });
    expect(result).toMatchObject({
      page: 1,
      limit: 1,
      total: 1,
      totalPages: 1,
    });
    expect(result.items[0]).toMatchObject({
      slug: "nordic-large",
      category: { name: "یخچال", slug: "refrigerators" },
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("sorts, paginates and exposes inactive products only to admin listing", async () => {
    await createFixtureCatalog();
    const first = await listProducts({ page: 1, limit: 1, sort: "price_desc" });
    const second = await listProducts({
      page: 2,
      limit: 1,
      sort: "price_desc",
    });
    expect(first).toMatchObject({ total: 2, totalPages: 2 });
    expect(first.items[0].price).toBe(30000000);
    expect(second.items[0].price).toBe(20000000);
    expect(
      (await listProductsAdmin({ page: 1, limit: 12, sort: "newest" })).total,
    ).toBe(3);
  });

  it("returns featured and related products while inactive slugs stay hidden", async () => {
    const { products, refrigerators } = await createFixtureCatalog();
    expect((await getFeaturedProducts())[0].slug).toBe("nordic-large");
    expect(await getProductBySlug("frostia-freezer")).toBeNull();
    expect(
      (await getRelatedProducts(products[0].id, refrigerators.id)).map(
        (item) => item.slug,
      ),
    ).toEqual(["arctic-efficient"]);
  });
});

describe("catalog management services", () => {
  it("creates category trees and prevents deleting non-empty categories", async () => {
    const parent = await createCategory({
      name: "خانگی",
      order: 1,
      isActive: true,
    });
    await createCategory({
      name: "کمبی",
      parent: parent.id,
      order: 1,
      isActive: true,
    });
    expect((await listCategories()).map((item) => item.name)).toEqual([
      "خانگی",
      "کمبی",
    ]);
    expect((await getCategoryTree())[0].children[0].name).toBe("کمبی");
    expect(await getCategoryBySlug(parent.slug)).toMatchObject({
      name: "خانگی",
    });
    await expect(deleteCategory(parent.id)).rejects.toEqual(
      expect.objectContaining({ code: "CONFLICT" }),
    );
  });

  it("creates, updates and deletes products as DTOs", async () => {
    const category = await createCategory({
      name: "ساید",
      order: 1,
      isActive: true,
    });
    const product = await createProduct({
      title: "یخچال تست حرفه‌ای",
      description: "محصول مخصوص آزمون سرویس",
      price: 18000000,
      stock: 3,
      images: ["https://example.com/test.jpg"],
      category: category.id,
      attributes: [],
      isActive: true,
      isFeatured: false,
    });
    expect(product.slug).toBe("یخچال-تست-حرفه-ای");
    const updated = await updateProduct(product.id, {
      title: "یخچال تست تازه",
      slug: product.slug,
      description: "نسخهٔ ویرایش‌شدهٔ محصول",
      price: 17500000,
      stock: 5,
      images: ["https://example.com/test.jpg"],
      category: category.id,
      attributes: [],
      isActive: true,
      isFeatured: true,
    });
    expect(updated).toMatchObject({ price: 17500000, isFeatured: true });
    await deleteProduct(product.id);
    await expect(deleteProduct(product.id)).rejects.toEqual(
      expect.objectContaining({ code: "NOT_FOUND" }),
    );
  });
});
