import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { startTestMongo } from "./mongo-server";
import { productInput, orderInput, userInput, addressInput } from "./fixtures";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn(async () => mongoose) }));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    NEXT_PUBLIC_SITE_URL: "https://shop.test",
    IMAGE_INTERNAL_ORIGINS: ["https://old.shop.test"],
    FREE_SHIPPING_THRESHOLD: 1000000,
    SHIPPING_FLAT_FEE: 50000,
  }),
}));
import { UploadedImage } from "@/models/uploaded-image";
import { Product } from "@/models/product";
import { Category } from "@/models/category";
import { Brand } from "@/models/brand";
import { Order } from "@/models/order";
import { User } from "@/models/user";
import { Cart } from "@/models/cart";
import { Counter } from "@/models/counter";
import { createOrderFromCart } from "@/services/order.service";
import {
  cleanupImages,
  withImageReferences,
} from "@/services/image-lifecycle.service";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/services/product.service";
import { createCategory, updateCategory } from "@/services/category.service";
import { createBrand, updateBrand } from "@/services/brand.service";

let server: Awaited<ReturnType<typeof startTestMongo>>;
beforeAll(async () => {
  server = await startTestMongo(true);
  await mongoose.connect(server.uri);
  await Promise.all([
    UploadedImage.init(),
    Product.init(),
    Category.init(),
    Brand.init(),
    Order.init(),
    User.init(),
    Cart.init(),
    Counter.init(),
  ]);
}, 180000);
beforeEach(async () => {
  await Promise.all([
    UploadedImage.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Brand.deleteMany({}),
    Order.deleteMany({}),
    User.deleteMany({}),
    Cart.deleteMany({}),
    Counter.deleteMany({}),
  ]);
});
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});

async function image(old = true) {
  const doc = await UploadedImage.create({
    data: Buffer.from("fixture"),
    contentType: "image/png",
  });
  if (old)
    await UploadedImage.collection.updateOne(
      { _id: doc._id },
      { $set: { createdAt: new Date(Date.now() - 48 * 3600000) } },
    );
  return { id: String(doc._id), url: `/api/images/${doc._id}` };
}

it("previews orphans, preserves the grace period, bounds batches and deletes idempotently", async () => {
  const orphan = await image();
  const fresh = await image(false);
  expect(await cleanupImages()).toMatchObject({
    apply: false,
    scanned: 1,
    results: [{ id: orphan.id, status: "orphan" }],
  });
  expect(await UploadedImage.countDocuments()).toBe(2);
  expect(await cleanupImages({ apply: true, limit: 1 })).toMatchObject({
    scanned: 1,
    results: [{ id: orphan.id, status: "deleted" }],
    nextAfter: orphan.id,
  });
  expect(await UploadedImage.exists({ _id: fresh.id })).not.toBeNull();
  expect((await cleanupImages({ apply: true })).scanned).toBe(0);
  await expect(cleanupImages({ limit: 101 })).rejects.toThrow();
});

it("preserves references in inactive products, categories, brands and historical orders including URL aliases", async () => {
  const images = await Promise.all(Array.from({ length: 4 }, () => image()));
  await Product.create({
    ...productInput,
    isActive: false,
    images: [images[0].url],
  });
  await Category.create({
    name: "دسته",
    slug: "category",
    image: "https://shop.test" + images[1].url + "?v=1",
  });
  await Brand.create({ name: "برند", slug: "brand", logo: images[2].url });
  await Order.create({
    ...orderInput,
    items: [
      {
        ...orderInput.items[0],
        image: "https://shop.test/api/%69mages/" + images[3].id,
      },
    ],
  });
  const result = await cleanupImages({ apply: true });
  expect(result.results.map((entry) => entry.status)).toEqual(
    Array(4).fill("referenced"),
  );
  expect(await UploadedImage.countDocuments()).toBe(4);
});

it("tracks product replacements/deletion while preserving shared category and brand references", async () => {
  const first = await image();
  const second = await image();
  const category = await createCategory({
    name: "دسته",
    slug: "category",
    image: first.url,
    order: 0,
    isActive: true,
  });
  const brand = await createBrand({
    name: "برند",
    slug: "brand",
    logo: first.url,
  });
  const input = {
    ...productInput,
    attributes: [],
    isActive: true,
    isFeatured: false,
    category: category.id,
    images: [first.url],
  };
  const product = await createProduct(input);
  await updateProduct(product.id, { ...input, images: [second.url] });
  await deleteProduct(product.id);
  const result = await cleanupImages({ apply: true });
  expect(result.results).toContainEqual({ id: first.id, status: "referenced" });
  expect(result.results).toContainEqual({ id: second.id, status: "deleted" });
  await updateCategory(category.id, {
    name: "دسته",
    slug: "category",
    order: 0,
    isActive: true,
  });
  await updateBrand(brand.id, { name: "برند", slug: "brand" });
  expect((await cleanupImages({ apply: true })).results).toContainEqual({
    id: first.id,
    status: "deleted",
  });
});

it("rolls back deletion failures and reports them for a safe retry", async () => {
  const orphan = await image();
  const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const remove = vi
    .spyOn(UploadedImage, "deleteOne")
    .mockRejectedValueOnce(new Error("storage failure"));
  expect((await cleanupImages({ apply: true })).results).toEqual([
    { id: orphan.id, status: "failed" },
  ]);
  remove.mockRestore();
  expect(await UploadedImage.exists({ _id: orphan.id })).not.toBeNull();
  expect((await cleanupImages({ apply: true })).results).toEqual([
    { id: orphan.id, status: "deleted" },
  ]);
  expect(log).toHaveBeenCalled();
  log.mockRestore();
});

it("serializes attachment against cleanup across concurrent transactions", async () => {
  const shared = await image();
  let signal!: () => void;
  const locked = new Promise<void>((resolve) => {
    signal = resolve;
  });
  let release!: () => void;
  const proceed = new Promise<void>((resolve) => {
    release = resolve;
  });
  const attaching = withImageReferences([shared.url], async (session) => {
    signal();
    await proceed;
    await new Category({
      name: "دسته",
      slug: "concurrent",
      image: shared.url,
    }).save({ session });
  });
  await locked;
  const cleaning = cleanupImages({ apply: true });
  release();
  await attaching;
  expect((await cleaning).results).toEqual([
    { id: shared.id, status: "referenced" },
  ]);
  expect(await UploadedImage.exists({ _id: shared.id })).not.toBeNull();
});

it("rejects attachment after cleanup won, and rolls back failed entity writes", async () => {
  const orphan = await image();
  await cleanupImages({ apply: true });
  const write = vi.fn();
  await expect(withImageReferences([orphan.url], write)).rejects.toMatchObject({
    code: "VALIDATION",
  });
  expect(write).not.toHaveBeenCalled();
  const another = await image();
  await expect(
    withImageReferences([another.url], async () => {
      throw new Error("entity failure");
    }),
  ).rejects.toThrow("entity failure");
  expect(
    (await UploadedImage.findById(another.id).lean())?.referenceRevision,
  ).toBe(0);
});

it("keeps uploaded order snapshots after the source product is deleted", async () => {
  const uploaded = await image();
  const customer = await User.create({
    ...userInput,
    addresses: [addressInput],
  });
  const product = await Product.create({
    ...productInput,
    images: [uploaded.url],
  });
  await Cart.create({
    user: customer._id,
    items: [{ product: product._id, quantity: 1 }],
  });
  const order = await createOrderFromCart(String(customer._id), {
    addressId: String(customer.addresses[0]._id),
  });
  expect(order.items[0].image).toBe(uploaded.url);
  await deleteProduct(String(product._id));
  expect((await cleanupImages({ apply: true })).results).toEqual([
    { id: uploaded.id, status: "referenced" },
  ]);
});

it("does not commit a dangling reference when cleanup holds the lock first", async () => {
  const uploaded = await image();
  let signal!: () => void;
  const deleting = new Promise<void>((resolve) => {
    signal = resolve;
  });
  let release!: () => void;
  const proceed = new Promise<void>((resolve) => {
    release = resolve;
  });
  const original = UploadedImage.deleteOne.bind(UploadedImage);
  const remove = vi
    .spyOn(UploadedImage, "deleteOne")
    .mockImplementationOnce(
      (...args: Parameters<typeof UploadedImage.deleteOne>) => {
        // Hold the cleanup transaction's image write while an attachment starts.
        const query = original(...args);
        const exec = query.exec.bind(query);
        vi.spyOn(query, "exec").mockImplementationOnce(async () => {
          signal();
          await proceed;
          return exec();
        });
        return query;
      },
    );
  try {
    const cleaning = cleanupImages({ apply: true });
    await deleting;
    const attaching = createCategory({
      name: "دسته",
      slug: "late",
      image: uploaded.url,
      order: 0,
      isActive: true,
    });
    const rejected = expect(attaching).rejects.toMatchObject({
      code: "VALIDATION",
    });
    release();
    expect((await cleaning).results).toEqual([
      { id: uploaded.id, status: "deleted" },
    ]);
    await rejected;
    expect(await Category.countDocuments()).toBe(0);
  } finally {
    release();
    remove.mockRestore();
  }
});

it("allows external URLs with matching paths without requiring a local image", async () => {
  const id = new mongoose.Types.ObjectId().toString();
  const url = `https://cdn.test/api/images/${id}`;
  const category = await createCategory({
    name: "دسته",
    slug: "external",
    image: url,
    order: 0,
    isActive: true,
  });
  expect(category.image).toBe(url);
});

it("locks configured absolute and historical alias references", async () => {
  for (const origin of ["https://shop.test", "https://old.shop.test"]) {
    const uploaded = await image();
    await createCategory({
      name: origin,
      slug: new mongoose.Types.ObjectId().toString(),
      image: `${origin}/api/images/${uploaded.id}?v=1`,
      order: 0,
      isActive: true,
    });
    expect(
      (await UploadedImage.findById(uploaded.id).lean())?.referenceRevision,
    ).toBe(1);
    expect((await cleanupImages()).results).toContainEqual({
      id: uploaded.id,
      status: "referenced",
    });
  }
});

it("preserves ambiguous historical origins and malformed legacy references", async () => {
  const unknown = await image();
  const malformed = await image();
  await Category.collection.insertMany([
    {
      name: "legacy",
      slug: "legacy",
      image: `https://unknown-old.test/api/images/${unknown.id}`,
    },
    {
      name: "malformed",
      slug: "malformed",
      image: `https://shop.test/api/images/${malformed.id}%ZZ`,
    },
  ]);
  const result = await cleanupImages({ apply: true });
  expect(result.results).toContainEqual({
    id: unknown.id,
    status: "ambiguous",
  });
  expect(result.results).toContainEqual({
    id: malformed.id,
    status: "ambiguous",
  });
  expect(await UploadedImage.countDocuments()).toBe(2);
});

it("serializes two concurrent cleanup jobs without duplicate deletion", async () => {
  const orphan = await image();
  const results = await Promise.all([
    cleanupImages({ apply: true }),
    cleanupImages({ apply: true }),
  ]);
  expect(
    results
      .flatMap((result) => result.results)
      .filter((entry) => entry.status === "deleted"),
  ).toEqual([{ id: orphan.id, status: "deleted" }]);
  expect(await UploadedImage.countDocuments()).toBe(0);
});

it("uses bounded targeted queries without distinct across many legacy records", async () => {
  const uploaded = await image();
  await Category.collection.insertMany(
    Array.from({ length: 600 }, (_, index) => ({
      name: `fixture-${index}`,
      slug: `fixture-${index}`,
      image: `https://cdn.test/photo-${index}?hint=${uploaded.id}`,
    })),
  );
  await Order.create({
    ...orderInput,
    items: [
      {
        ...orderInput.items[0],
        image: `https://old.shop.test/api/%69mages/${uploaded.id}`,
      },
    ],
  });
  const distinct = vi.spyOn(Category, "distinct");
  expect((await cleanupImages({ apply: true })).results).toEqual([
    { id: uploaded.id, status: "referenced" },
  ]);
  expect(distinct).not.toHaveBeenCalled();
  distinct.mockRestore();
});

it("retries a transient transaction failure before considering deletion", async () => {
  const orphan = await image();
  const original = UploadedImage.updateOne.bind(UploadedImage);
  const update = vi
    .spyOn(UploadedImage, "updateOne")
    .mockImplementationOnce(
      (...args: Parameters<typeof UploadedImage.updateOne>) => {
        const query = original(...args);
        const error = new mongoose.mongo.MongoServerError({
          message: "Transient test conflict",
          code: 112,
        });
        error.addErrorLabel("TransientTransactionError");
        vi.spyOn(query, "exec").mockRejectedValueOnce(error);
        return query;
      },
    );
  try {
    expect((await cleanupImages({ apply: true })).results).toEqual([
      { id: orphan.id, status: "deleted" },
    ]);
    expect(update.mock.calls.length).toBeGreaterThanOrEqual(2);
  } finally {
    update.mockRestore();
  }
});

it("continues past retained candidates with its pagination cursor", async () => {
  const first = await image();
  const second = await image();
  await Category.create({ name: "دسته", slug: "cursor", image: first.url });
  const page = await cleanupImages({ limit: 1 });
  expect(page.nextAfter).toBe(first.id);
  expect(
    (await cleanupImages({ limit: 1, after: page.nextAfter })).results,
  ).toEqual([{ id: second.id, status: "orphan" }]);
});

it("preserves fully percent-encoded uppercase ObjectId aliases", async () => {
  const uploaded = await image();
  const encoded = [...uploaded.id.toUpperCase()]
    .map((char) => `%${char.charCodeAt(0).toString(16)}`)
    .join("");
  await Category.create({
    name: "دسته",
    slug: "encoded-uppercase",
    image: `https://shop.test/api/images/${encoded}`,
  });
  expect((await cleanupImages({ apply: true })).results).toEqual([
    { id: uploaded.id, status: "referenced" },
  ]);
});
