import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import mongoose from "mongoose";
import { compare } from "bcryptjs";
import { startTestMongo } from "./mongo-server";
vi.mock("server-only", () => ({}));
import { envSchema } from "@/lib/env";
import { User } from "@/models/user";
import { AdminOwnership } from "@/models/admin-ownership";
import { Product } from "@/models/product";
import { Category } from "@/models/category";
import { Cart } from "@/models/cart";
import { Counter } from "@/models/counter";
import { Brand } from "@/models/brand";
import { seedDatabase, parseSeedOptions } from "../scripts/seed-runner";

const env = envSchema.parse({
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://localhost/test",
  AUTH_SECRET: "test",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SITE_NAME: "تست",
  PAYMENT_PROVIDER: "fake",
  SHIPPING_FLAT_FEE: "0",
  FREE_SHIPPING_THRESHOLD: "0",
  SEED_ADMIN_EMAIL: "ADMIN@example.com",
  SEED_ADMIN_PASSWORD: "Admin123!",
});
let server: Awaited<ReturnType<typeof startTestMongo>>;
beforeAll(async () => {
  server = await startTestMongo();
  await mongoose.connect(server.uri, { dbName: "launchox_seed_test" });
}, 180000);
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});

it("rejects unsafe configuration and production without force before writes", () => {
  expect(() =>
    parseSeedOptions([], { ...env, NODE_ENV: "production" }),
  ).toThrow("--force");
  expect(
    parseSeedOptions(["--force"], { ...env, NODE_ENV: "production" }).reset,
  ).toBe(false);
  expect(() =>
    parseSeedOptions([], { ...env, SEED_ADMIN_EMAIL: undefined }),
  ).toThrow();
  expect(() =>
    parseSeedOptions([], {
      ...env,
      SEED_ADMIN_EMAIL: "customer@launchox.local",
    }),
  ).toThrow();
  expect(() =>
    parseSeedOptions([], { ...env, SEED_ADMIN_PASSWORD: "آ".repeat(37) }),
  ).toThrow();
  expect(() => parseSeedOptions(["--unknown"], env)).toThrow();
});

it("seeds the required catalog and accounts, preserves identities on rerun and resets only specified collections", async () => {
  const options = parseSeedOptions(["--reset"], env);
  const first = await seedDatabase(options);
  expect(first).toEqual({
    users: 2,
    categories: 8,
    products: 24,
    carts: 0,
    orders: 0,
    counters: 0,
    brands: 11,
  });
  const products = await Product.find().lean();
  const brands = await Brand.find().lean();
  expect(brands.filter((brand) => brand.isFeatured)).toHaveLength(3);
  expect(brands.every((brand) => brand.isActive)).toBe(true);
  for (const product of products) {
    const brand = brands.find((entry) => entry._id.equals(product.brand));
    expect(brand).toBeDefined();
    expect(
      product.attributes.some((attribute) => attribute.key === "برند"),
    ).toBe(false);
  }
  expect(products.filter((product) => product.isFeatured)).toHaveLength(6);
  expect(
    products.filter((product) => product.stock === 0).length,
  ).toBeGreaterThanOrEqual(2);
  expect(
    products.filter((product) => product.compareAtPrice).length,
  ).toBeGreaterThan(1);
  for (const product of products) {
    expect(product.price).toBeGreaterThanOrEqual(150000);
    expect(product.price).toBeLessThanOrEqual(45000000);
    expect(product.price % 1000).toBe(0);
    expect(product.stock).toBeLessThanOrEqual(50);
    expect(product.description.split(".").filter(Boolean)).toHaveLength(2);
    expect(product.attributes.length).toBeGreaterThanOrEqual(2);
    expect(product.attributes.length).toBeLessThanOrEqual(4);
    expect(product.images).toHaveLength(1);
    expect(product.images[0]).toMatch(
      /^\/images\/preview\/categories\/[a-z-]+\.png$/,
    );
    expect(existsSync(join(process.cwd(), "public", product.images[0]))).toBe(
      true,
    );
  }
  for (const category of await Category.find().lean()) {
    const count = products.filter((product) =>
      product.category.equals(category._id),
    ).length;
    expect(count).toBe(
      category.slug === "twin"
        ? 0
        : category.slug === "home-kitchen"
          ? 1
          : ["top-freezer", "bottom-freezer"].includes(category.slug)
            ? 2
            : category.slug === "sports-travel"
              ? 4
              : 5,
    );
    expect(count).toBeLessThanOrEqual(6);
  }
  const admin = await User.findOne({ role: "admin" })
    .select("+passwordHash")
    .lean()
    .orFail();
  const customer = await User.findOne({ role: "customer" })
    .select("+passwordHash")
    .lean()
    .orFail();
  expect(await compare(options.password, admin.passwordHash)).toBe(true);
  expect(await compare("Customer123!", customer.passwordHash)).toBe(true);
  expect(customer.addresses).toHaveLength(1);
  expect(customer.addresses[0].city).toBe("تهران");
  const second = await seedDatabase({ ...options, reset: false });
  expect(second).toEqual(first);
  expect(
    (await Brand.find().lean()).map((brand) => brand._id.toString()).sort(),
  ).toEqual(brands.map((brand) => brand._id.toString()).sort());
  expect(
    (await Product.find().sort({ slug: 1 }).lean()).map((product) =>
      product._id.toString(),
    ),
  ).toEqual(
    products
      .sort((a, b) => a.slug.localeCompare(b.slug))
      .map((product) => product._id.toString()),
  );
  const repeated = await User.findById(customer._id)
    .select("+passwordHash")
    .lean()
    .orFail();
  expect(repeated.passwordHash).toBe(customer.passwordHash);
  expect(repeated.addresses[0]._id).toEqual(customer.addresses[0]._id);
  await Counter.create({ _id: "order", seq: 100002 });
  await Cart.create({
    guestId: "550e8400-e29b-41d4-a716-446655440000",
    items: [],
  });
  expect(await seedDatabase({ ...options, reset: false })).toMatchObject({
    counters: 1,
    carts: 1,
  });
  expect(await seedDatabase(options)).toEqual(first);
  expect(
    (await User.findById(customer._id).lean().orFail()).addresses[0]._id,
  ).toEqual(customer.addresses[0]._id);
}, 60000);

it("catalog seed never overwrites owner credentials or transfers ownership", async () => {
  const options = parseSeedOptions([], env);
  await seedDatabase(options);
  const owner = await User.findOne({ role: "admin" })
    .select("+passwordHash")
    .lean()
    .orFail();
  await AdminOwnership.create({ _id: "store-owner", owner: owner._id });
  await seedDatabase({ ...options, password: "DifferentSeed123!" });
  const after = await User.findById(owner._id)
    .select("+passwordHash")
    .lean()
    .orFail();
  expect(after.passwordHash).toBe(owner.passwordHash);
  expect(
    String((await AdminOwnership.findById("store-owner").lean())?.owner),
  ).toBe(String(owner._id));
}, 30000);
