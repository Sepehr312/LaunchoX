import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { renderToStaticMarkup } from "react-dom/server";
import { startTestMongo } from "./mongo-server";
import { ArcticProductCategories } from "@/components/preview/frostic/ArcticProductCategories";
import { CategoriesListing } from "@/components/store/CategoriesListing";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn(async () => mongoose) }));

import { Category } from "@/models/category";
import { Product } from "@/models/product";
import { Brand } from "@/models/brand";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryBySlug,
  listCategories,
  listStoreCategories,
} from "@/services/category.service";
import {
  getProductBySlug,
  listCategoryProducts,
  listProducts,
  getBrandCategories,
} from "@/services/product.service";
import { connectDB } from "@/lib/db";

let server: Awaited<ReturnType<typeof startTestMongo>>;
beforeAll(async () => {
  server = await startTestMongo();
  await mongoose.connect(server.uri, {
    dbName: "launchox_dynamic_categories_test",
  });
  await Promise.all([Category.init(), Product.init(), Brand.init()]);
}, 180000);
beforeEach(async () => {
  await Promise.all([
    Category.deleteMany({}),
    Product.deleteMany({}),
    Brand.deleteMany({}),
  ]);
});
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});

async function fixture() {
  const category = await createCategory({
    name: "دستهٔ تازه",
    slug: "fresh-category",
    image: "/images/custom.png",
    description: "توضیح ثبت‌شده",
    order: 3,
    isActive: true,
  });
  const other = await createCategory({
    name: "دستهٔ دیگر",
    slug: "other-category",
    order: 1,
    isActive: true,
  });
  const brands = await Brand.create([
    { name: "برند یک", slug: "brand-one" },
    { name: "برند دو", slug: "brand-two" },
  ]);
  await Product.create(
    Array.from({ length: 5 }, (_, i) => ({
      title: `محصول آزمون ${i}`,
      slug: `dynamic-product-${i}`,
      description: "محصول آزمایشی",
      category: i === 4 ? other.id : category.id,
      brand: brands[i % 2]._id,
      images: ["/images/product.png"],
      price: 1000 + i * 100,
      stock: i === 1 ? 0 : 2,
    })),
  );
  return { category, other, brands };
}

it("reflects create, rename, image, slug, activation and deletion in both category surfaces", async () => {
  const { category } = await fixture();
  const render = async () => {
    const categories = await listStoreCategories();
    return renderToStaticMarkup(
      <>
        <ArcticProductCategories categories={categories} />
        <CategoriesListing categories={categories} />
      </>,
    );
  };
  expect(await render()).toContain(encodeURIComponent("/images/custom.png"));
  const updated = await updateCategory(category.id, {
    name: "نام تازه",
    slug: "دسته-تازه",
    image: "/images/replacement.png",
    description: "توضیح تازه",
    order: 0,
    isActive: true,
  });
  const html = await render();
  expect(html).toContain(`/categories/${encodeURIComponent(updated.slug)}`);
  expect(html).toContain("نام تازه");
  expect(html).toContain("توضیح تازه");
  expect(html).toContain(encodeURIComponent("/images/replacement.png"));
  expect(html).not.toContain(encodeURIComponent("/images/custom.png"));
  expect(html).not.toContain("/categories/fresh-category");
  expect((await listCategories())[0].id).toBe(category.id);
  expect(await getCategoryBySlug("fresh-category")).toBeNull();
  expect(
    await getCategoryBySlug(encodeURIComponent(updated.slug)),
  ).toMatchObject({ id: category.id });
  expect(await getProductBySlug("dynamic-product-0")).toMatchObject({
    category: { id: category.id, name: updated.name, slug: updated.slug },
  });
  await updateCategory(category.id, { ...updated, isActive: false });
  expect(await getCategoryBySlug(updated.slug)).toBeNull();
  expect(await render()).not.toContain(
    `/categories/${encodeURIComponent(updated.slug)}`,
  );
  await expect(listCategoryProducts(updated.slug, {})).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  expect(
    await listProducts({
      category: category.id,
      page: 1,
      limit: 2,
      sort: "newest",
    }),
  ).toMatchObject({ items: [], total: 0 });
  expect(await getProductBySlug("dynamic-product-0")).toMatchObject({
    category: { isActive: false },
  });
  await updateCategory(category.id, { ...updated, isActive: true });
  expect((await listCategoryProducts(updated.slug, {})).total).toBe(4);
  await expect(deleteCategory(category.id)).rejects.toMatchObject({
    code: "CONFLICT",
  });
  const empty = await createCategory({
    name: "دستهٔ خالی",
    slug: "empty-custom",
    order: 0,
    isActive: true,
  });
  expect(await listCategoryProducts(empty.slug, {})).toMatchObject({
    items: [],
    total: 0,
  });
  await deleteCategory(empty.id);
  expect(await render()).not.toContain("/categories/empty-custom");
});

it("scopes category pagination, combined brand filters, counts and sorting using current IDs", async () => {
  const { category, other, brands } = await fixture();
  const first = await listCategoryProducts(category.slug, {
    category: other.id,
    limit: "1",
    sort: "price_asc",
    brands: brands[0].name,
  });
  const second = await listCategoryProducts(category.slug, {
    limit: "1",
    page: "2",
    sort: "price_asc",
    brands: brands[0].name,
  });
  expect(first).toMatchObject({ total: 2, totalPages: 2 });
  expect(first.items[0]).toMatchObject({
    slug: "dynamic-product-0",
    category: { id: category.id },
  });
  expect(second.items[0].slug).toBe("dynamic-product-2");
  expect(
    (await getBrandCategories(String(brands[0]._id))).map((item) => item.id),
  ).toContain(category.id);
  expect(
    (await listStoreCategories()).find((item) => item.id === category.id)
      ?.productCount,
  ).toBe(4);
  await expect(
    listCategoryProducts("missing-category", {}),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(
    listCategoryProducts(category.slug, { page: "invalid" }),
  ).rejects.toMatchObject({ code: "VALIDATION" });
});

it("uses neutral artwork for an image-less category even with a historical fixture slug", async () => {
  const category = await createCategory({
    name: "دستهٔ سفارشی",
    slug: "digital",
    order: 0,
    isActive: true,
  });
  const categories = await listStoreCategories();
  const html = renderToStaticMarkup(
    <>
      <ArcticProductCategories categories={categories} />
      <CategoriesListing categories={categories} />
    </>,
  );
  expect(html).toContain(`/categories/${category.slug}`);
  expect(html).not.toContain("/images/preview/categories");
  expect(html).not.toContain("/categories/clothing");
});

it("distinguishes database failure from empty or missing categories", async () => {
  expect(await listCategories()).toEqual([]);
  expect(await getCategoryBySlug("missing-category")).toBeNull();
  const error = new Error("Database unavailable");
  vi.mocked(connectDB).mockRejectedValueOnce(error);
  await expect(listCategories()).rejects.toBe(error);
  vi.mocked(connectDB).mockRejectedValueOnce(error);
  await expect(getCategoryBySlug("missing-category")).rejects.toBe(error);
});
