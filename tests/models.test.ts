import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import mongoose, { Types } from "mongoose";
import { startTestMongo } from "./mongo-server";

vi.mock("server-only", () => ({}));
import { User } from "@/models/user";
import { Category } from "@/models/category";
import { Product } from "@/models/product";
import { Cart } from "@/models/cart";
import { Order } from "@/models/order";
import { Counter } from "@/models/counter";
import { toDTO } from "@/lib/model-shared";
import type {
  UserDTO,
  ProductDTO,
  CategoryDTO,
  OrderDTO,
  CounterDTO,
} from "@/types/dto";
import {
  addressInput,
  guestId,
  objectId,
  orderInput,
  passwordHash,
  productInput,
  userInput,
} from "./fixtures";

let server: Awaited<ReturnType<typeof startTestMongo>> | undefined;
beforeAll(async () => {
  server = await startTestMongo();
  await mongoose.connect(server.uri, {
    dbName: "launchox_step4_test",
    bufferCommands: false,
  });
  await Promise.all([
    User.init(),
    Category.init(),
    Product.init(),
    Cart.init(),
    Order.init(),
    Counter.init(),
  ]);
}, 180000);
beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Cart.deleteMany({}),
    Order.deleteMany({}),
    Counter.deleteMany({}),
  ]);
});
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});

describe("users and serialization", () => {
  it("defaults to customer, normalizes email and never serializes password hashes", async () => {
    const user = await User.create({
      ...userInput,
      email: " ALI@Example.COM ",
      addresses: [addressInput],
    });
    expect(user.role).toBe("customer");
    expect(user.email).toBe("ali@example.com");
    expect(user.isActive).toBe(true);
    expect(user.createdAt).toBeInstanceOf(Date);
    const hidden = await User.findById(user._id).lean().orFail();
    expect(hidden.passwordHash).toBeUndefined();
    const selected = await User.findById(user._id)
      .select("+passwordHash")
      .orFail();
    expect(selected.passwordHash).toBe(passwordHash);
    const json: unknown = selected.toJSON();
    expect(json).toMatchObject({
      id: user._id.toString(),
      addresses: [{ id: expect.any(String), createdAt: expect.any(String) }],
    });
    expect(JSON.stringify(json)).not.toMatch(/passwordHash|__v|_id/);
    const dto: UserDTO = toDTO(hidden);
    expect(dto.createdAt).toBe(user.createdAt.toISOString());
    expect(dto.addresses[0].mobile).toBe(addressInput.mobile);
    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto);
    expect(toDTO(selected.toObject())).not.toHaveProperty("passwordHash");
  });
  it("enforces unique email and sparse unique mobile", async () => {
    await User.create(userInput);
    await User.create({
      ...userInput,
      email: "second@example.com",
      mobile: "",
    });
    await User.create({
      ...userInput,
      email: "third@example.com",
      mobile: "09123456789",
    });
    await expect(
      User.create({ ...userInput, email: "ALI@EXAMPLE.COM" }),
    ).rejects.toMatchObject({ code: 11000 });
    await expect(
      User.create({
        ...userInput,
        email: "fourth@example.com",
        mobile: "09123456789",
      }),
    ).rejects.toMatchObject({ code: 11000 });
  });
  it.each([
    { name: "ا" },
    { role: "owner" },
    { mobile: "123" },
    { passwordHash: "plaintext" },
    { addresses: Array(6).fill(addressInput) },
  ])("rejects invalid user fields %j", async (patch) => {
    await expect(
      new User({ ...userInput, ...patch }).validate(),
    ).rejects.toBeInstanceOf(mongoose.Error.ValidationError);
  });
});

describe("categories and products", () => {
  it("persists defaults and DTOs with string references", async () => {
    const category = await Category.create({ name: "کتاب", slug: "کتاب" });
    const product = await Product.create({
      ...productInput,
      category: category._id,
      attributes: [{ key: "رنگ", value: "سیاه" }],
    });
    expect(product).toMatchObject({
      isActive: true,
      isFeatured: false,
      soldCount: 0,
    });
    const categoryDTO: CategoryDTO = toDTO(
      await Category.findById(category._id).lean().orFail(),
    );
    const productDTO: ProductDTO = toDTO(
      await Product.findById(product._id).lean().orFail(),
    );
    expect(categoryDTO.order).toBe(0);
    expect(productDTO.category).toBe(categoryDTO.id);
    expect(product.toJSON()).toMatchObject({
      id: productDTO.id,
      category: categoryDTO.id,
    });
    expect(category.toJSON()).toMatchObject({ id: categoryDTO.id });
    expect(JSON.parse(JSON.stringify(productDTO))).toEqual(productDTO);
  });
  it("enforces category name/slug and product slug/SKU unique indexes", async () => {
    await Category.create({ name: "کتاب", slug: "کتاب" });
    await expect(
      Category.create({ name: "کتاب", slug: "دیگر" }),
    ).rejects.toMatchObject({ code: 11000 });
    await expect(
      Category.create({ name: "دیگر", slug: "کتاب" }),
    ).rejects.toMatchObject({ code: 11000 });
    await Product.create(productInput);
    await Product.create({ ...productInput, slug: "دوم", sku: "" });
    await Product.create({ ...productInput, slug: "سوم", sku: "sku-1" });
    await expect(Product.create(productInput)).rejects.toMatchObject({
      code: 11000,
    });
    await expect(
      Product.create({ ...productInput, slug: "چهارم", sku: "sku-1" }),
    ).rejects.toMatchObject({ code: 11000 });
  });
  it.each([
    { price: -1 },
    { price: 1.2 },
    { price: Number.MAX_SAFE_INTEGER + 1 },
    { compareAtPrice: 150000 },
    { compareAtPrice: 150000.5 },
    { stock: -1 },
    { stock: 0.5 },
    { images: [] },
    { images: Array(9).fill("https://example.com/a") },
    { images: ["bad"] },
    { title: "اب" },
    { category: undefined },
  ])("rejects invalid product %j", async (patch) => {
    await expect(
      new Product({ ...productInput, ...patch }).validate(),
    ).rejects.toBeInstanceOf(mongoose.Error.ValidationError);
  });
  it("installs product search and compound indexes", async () => {
    const indexes = await Product.collection.indexes();
    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { category: 1, isActive: 1, createdAt: -1 },
        }),
        expect.objectContaining({ key: { isFeatured: 1, isActive: 1 } }),
        expect.objectContaining({ weights: { description: 1, title: 1 } }),
      ]),
    );
  });
});

describe("cart ownership and expiry", () => {
  it.each([
    {},
    { user: objectId, guestId },
    { guestId: "bad" },
    { user: objectId, guestId: null },
    { user: null, guestId },
  ])("rejects invalid owner %j", async (owner) => {
    await expect(new Cart(owner).validate()).rejects.toBeInstanceOf(
      mongoose.Error.ValidationError,
    );
  });
  it.each([0, 11, 1.5])("rejects invalid quantity %s", async (quantity) => {
    await expect(
      new Cart({
        guestId,
        items: [{ product: objectId, quantity }],
      }).validate(),
    ).rejects.toBeInstanceOf(mongoose.Error.ValidationError);
  });
  it("enforces unique owners and stores no item prices", async () => {
    const cart = await Cart.create({
      guestId,
      items: [{ product: objectId, quantity: 1, price: 10 }],
    });
    await Cart.create({ user: objectId });
    await expect(Cart.create({ guestId })).rejects.toMatchObject({
      code: 11000,
    });
    await expect(Cart.create({ user: objectId })).rejects.toMatchObject({
      code: 11000,
    });
    expect(cart.toJSON()).toMatchObject({
      id: cart._id.toString(),
      items: [{ product: objectId, quantity: 1 }],
    });
    expect(JSON.stringify(cart.toJSON())).not.toContain("price");
  });
  it("TTL removes only stale guest carts and preserves customer and fresh guest carts", async () => {
    const oldGuest = await Cart.create({ guestId });
    const customer = await Cart.create({ user: objectId });
    const freshGuest = await Cart.create({
      guestId: "550e8400-e29b-41d4-a716-446655440001",
    });
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await Cart.collection.updateMany(
      { _id: { $in: [oldGuest._id, customer._id] } },
      { $set: { updatedAt: oldDate } },
    );
    const indexes = await Cart.collection.indexes();
    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { updatedAt: 1 },
          expireAfterSeconds: 2592000,
          partialFilterExpression: { guestId: { $exists: true } },
        }),
      ]),
    );
    await vi.waitFor(
      async () => expect(await Cart.findById(oldGuest._id)).toBeNull(),
      { timeout: 10000, interval: 200 },
    );
    expect(await Cart.exists({ _id: customer._id })).not.toBeNull();
    expect(await Cart.exists({ _id: freshGuest._id })).not.toBeNull();
  }, 15000);
});

describe("orders, counters and model reload", () => {
  it("rejects null values for required states and collections", async () => {
    const documents = [
      new User({ ...userInput, role: null }),
      new User({ ...userInput, isActive: null }),
      new Product({ ...productInput, attributes: null }),
      new Cart({ guestId, items: null }),
      new Order({ ...orderInput, status: null }),
      new Order({ ...orderInput, payment: null }),
      new Order({ ...orderInput, payment: { status: null } }),
    ];
    for (const document of documents)
      await expect(document.validate()).rejects.toBeInstanceOf(
        mongoose.Error.ValidationError,
      );
  });
  it("stores a separate address snapshot and serializable order data", async () => {
    const user = await User.create({ ...userInput, addresses: [addressInput] });
    const order = await Order.create({
      ...orderInput,
      user: user._id,
      shippingAddress: user.addresses[0],
    });
    user.addresses[0].city = "شیراز";
    await user.save();
    const dto: OrderDTO = toDTO(
      await Order.findById(order._id).lean().orFail(),
    );
    expect(dto.shippingAddress.city).toBe("تهران");
    expect(dto.shippingAddress).not.toHaveProperty("id");
    expect(dto).toMatchObject({
      status: "pending",
      payment: { status: "unpaid" },
      items: [{ product: objectId, price: 150000 }],
      statusHistory: [{ status: "pending", changedBy: objectId }],
    });
    expect(order.toJSON()).toMatchObject({
      id: dto.id,
      user: user._id.toString(),
    });
    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto);
    await expect(Order.create(orderInput)).rejects.toMatchObject({
      code: 11000,
    });
    expect(await Order.collection.indexes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: { user: 1, createdAt: -1 } }),
        expect.objectContaining({ key: { status: 1, createdAt: -1 } }),
        expect.objectContaining({ key: { "payment.authority": 1 } }),
      ]),
    );
  });
  it.each([
    { items: [] },
    { total: -1 },
    { shippingFee: 1.5 },
    { shippingAddress: undefined },
    { status: "paid" },
    { payment: { status: "invalid" } },
    { note: "ا".repeat(501) },
  ])("rejects invalid order %j", async (patch) => {
    await expect(
      new Order({ ...orderInput, ...patch }).validate(),
    ).rejects.toBeInstanceOf(mongoose.Error.ValidationError);
  });
  it("stores a string counter ID with timestamps and integer sequence", async () => {
    const counter = await Counter.create({ _id: "orders" });
    const dto: CounterDTO = toDTO(
      await Counter.findById("orders").lean().orFail(),
    );
    expect(dto).toMatchObject({
      id: "orders",
      seq: 100000,
      createdAt: expect.any(String),
    });
    expect(counter.toJSON()).toEqual(dto);
    await expect(
      new Counter({ _id: "bad", seq: 1.5 }).validate(),
    ).rejects.toBeInstanceOf(mongoose.Error.ValidationError);
  });
  it("redacts secrets recursively from lean data", () => {
    const id = new Types.ObjectId();
    expect(
      toDTO({
        _id: id,
        passwordHash,
        __v: 1,
        child: { _id: id, passwordHash, __v: 2 },
        date: new Date("2026-01-01T00:00:00Z"),
      }),
    ).toEqual({
      id: id.toString(),
      child: { id: id.toString() },
      date: "2026-01-01T00:00:00.000Z",
    });
  });
  it("reuses every registered model across module reload", async () => {
    vi.resetModules();
    expect((await import("@/models/user")).User).toBe(User);
    expect((await import("@/models/category")).Category).toBe(Category);
    expect((await import("@/models/product")).Product).toBe(Product);
    expect((await import("@/models/cart")).Cart).toBe(Cart);
    expect((await import("@/models/order")).Order).toBe(Order);
    expect((await import("@/models/counter")).Counter).toBe(Counter);
  });
});
