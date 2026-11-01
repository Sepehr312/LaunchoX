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
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArcticProductCategories } from "@/components/preview/frostic/ArcticProductCategories";
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
  listStoreCategories,
  listCategoriesAdmin,
  getCategoryAdmin,
  updateCategory,
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
  getProductAdmin,
  setProductActive,
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
  it("reads product details once and reflects deletion without a stale service cache", async () => {
    const { products } = await createFixtureCatalog();
    const lookup = vi.spyOn(Product, "findOne");
    try {
      const product = await getProductBySlug(products[0].slug);
      expect(product).toMatchObject({
        id: String(products[0]._id),
        category: { slug: "refrigerators" },
      });
      expect(JSON.parse(JSON.stringify(product))).toEqual(product);
      expect(lookup).toHaveBeenCalledTimes(1);
      expect(lookup).toHaveBeenCalledWith({
        slug: products[0].slug,
        isActive: true,
      });
      await deleteProduct(String(products[0]._id));
      expect(await getProductBySlug(products[0].slug)).toBeNull();
      expect(await getProductBySlug("never-existed")).toBeNull();
      expect(await getProductBySlug(products[2].slug)).toBeNull();
      expect(await getProductBySlug(products[1].slug)).toMatchObject({
        stock: 0,
      });
    } finally {
      lookup.mockRestore();
    }
  });

  it("lists active categories with only active product counts and includes empty categories", async () => {
    const { refrigerators, freezers } = await createFixtureCatalog();
    await Category.create({
      name: "Hidden category",
      slug: "hidden",
      isActive: false,
    });
    const result = await listStoreCategories();
    expect(
      result.map(({ id, productCount }) => ({ id, productCount })),
    ).toEqual([
      { id: String(refrigerators._id), productCount: 2 },
      { id: String(freezers._id), productCount: 0 },
    ]);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

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
  it("updates homepage cards after category edits, deactivation and deletion without restoring static categories", async () => {
    const category = await createCategory({
      name: "دستهٔ آزمایشی",
      slug: "twin",
      order: 1,
      isActive: true,
    });
    const renderCategories = async () =>
      renderToStaticMarkup(
        createElement(ArcticProductCategories, {
          categories: await listCategories(),
        }),
      );
    expect(await renderCategories()).toContain('href="/categories/twin"');
    expect(await renderCategories()).not.toContain(
      'href="/categories/digital"',
    );
    await updateCategory(category.id, {
      name: "نام ویرایش‌شده",
      slug: "twin",
      order: 2,
      isActive: false,
    });
    const hidden = await renderCategories();
    expect(hidden).not.toContain('href="/categories/twin"');
    expect(hidden).toContain("هنوز دسته‌بندی‌ای برای نمایش وجود ندارد");
    await updateCategory(category.id, {
      name: "نام ویرایش‌شده",
      slug: "custom-category",
      order: 2,
      isActive: true,
    });
    const updated = await renderCategories();
    expect(updated).toContain("نام ویرایش‌شده");
    expect(updated).toContain('href="/categories/custom-category"');
    expect(updated).not.toContain('href="/categories/twin"');
    await deleteCategory(category.id);
    expect(await renderCategories()).not.toContain(
      'href="/categories/custom-category"',
    );
  });

  it("lists inactive categories, clears optional fields and enforces parent depth", async () => {
    const root = await createCategory({
      name: "ریشه",
      order: 0,
      isActive: false,
    });
    const child = await createCategory({
      name: "فرزند",
      parent: root.id,
      description: "توضیح",
      image: "/test.png",
      order: 0,
      isActive: true,
    });
    expect((await listCategoriesAdmin()).length).toBe(2);
    expect(await getCategoryAdmin(root.id)).toMatchObject({ isActive: false });
    await expect(
      updateCategory(root.id, {
        name: root.name,
        parent: child.id,
        order: 0,
        isActive: false,
      }),
    ).rejects.toThrow();
    const other = await createCategory({
      name: "ریشه دیگر",
      order: 0,
      isActive: true,
    });
    await expect(
      updateCategory(root.id, {
        name: root.name,
        parent: other.id,
        order: 0,
        isActive: false,
      }),
    ).rejects.toThrow();
    await expect(
      updateCategory(child.id, {
        name: child.name,
        parent: child.id,
        order: 0,
        isActive: true,
      }),
    ).rejects.toThrow();
    const updated = await updateCategory(child.id, {
      name: child.name,
      slug: child.slug,
      order: 2,
      isActive: false,
    });
    expect(updated.parent).toBeUndefined();
    expect(updated.description).toBeUndefined();
    expect(updated.image).toBeUndefined();
    await deleteCategory(child.id);
    expect(await getCategoryAdmin(child.id)).toBeNull();
  });

  it("rejects deleting categories linked to active or inactive products", async () => {
    const { refrigerators, freezers } = await createFixtureCatalog();
    for (const category of [refrigerators, freezers]) {
      await expect(deleteCategory(category.id)).rejects.toMatchObject({
        code: "CONFLICT",
      });
      expect(await getCategoryAdmin(category.id)).not.toBeNull();
    }
  });
  it("rejects deleting categories referenced by legacy string IDs", async () => {
    const category = await createCategory({
      name: "Legacy",
      order: 0,
      isActive: true,
    });
    const collection = mongoose.connection.db!.collection("products");
    const product = await collection.insertOne({
      category: category.id,
      isActive: false,
    });
    await expect(deleteCategory(category.id)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(await getCategoryAdmin(category.id)).not.toBeNull();
    expect(
      await collection.findOne({ _id: product.insertedId }),
    ).not.toBeNull();
  });
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

it("clears optional fields, preserves sales and hides deactivated products", async () => {
  const { products } = await createFixtureCatalog();
  const id = products[0].id;
  const product = await getProductAdmin(id);
  if (!product) throw new Error("Missing fixture");
  const input = {
    title: product.title,
    slug: product.slug,
    description: product.description,
    price: product.price,
    stock: product.stock,
    images: [...product.images, "/test.jpg"],
    category: product.category.id,
    attributes: [{ key: "capacity", value: "large" }],
    isActive: true,
    isFeatured: false,
  };
  await updateProduct(id, {
    ...input,
    compareAtPrice: input.price + 1000,
    sku: "TEST-OPTIONAL",
  });
  const updated = await updateProduct(id, input);
  expect(updated.compareAtPrice).toBeUndefined();
  expect(updated.sku).toBeUndefined();
  expect(updated.soldCount).toBe(product.soldCount);
  expect(updated.images).toEqual(input.images);
  await setProductActive(id, false);
  expect(await getProductBySlug(product.slug)).toBeNull();
  expect(await getProductAdmin(id)).toMatchObject({ isActive: false });
  await expect(
    updateProduct(id, { ...input, compareAtPrice: input.price - 1 }),
  ).rejects.toThrow();
});
