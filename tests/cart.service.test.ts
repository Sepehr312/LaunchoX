import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import mongoose, { Types } from "mongoose";
import { randomUUID } from "node:crypto";
import { startTestMongo } from "./mongo-server";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: async () => mongoose }));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ FREE_SHIPPING_THRESHOLD: 1000, SHIPPING_FLAT_FEE: 50 }),
}));
import { Cart } from "@/models/cart";
import { Product } from "@/models/product";
import {
  addToCart,
  updateCartItem,
  getCart,
  removeFromCart,
  clearCart,
  mergeGuestCart,
} from "@/services/cart.service";
import { calculateShipping } from "@/services/order.service";

let server: Awaited<ReturnType<typeof startTestMongo>>;
const guest = { guestId: randomUUID() };
const user = { user: new Types.ObjectId().toString() };
let first: string;
let second: string;
beforeAll(async () => {
  server = await startTestMongo();
  await mongoose.connect(server.uri, {
    dbName: "launchox_cart_test",
    bufferCommands: false,
  });
  await Cart.init();
}, 180000);
beforeEach(async () => {
  await Promise.all([Cart.deleteMany({}), Product.deleteMany({})]);
  const records = await Product.create([
    {
      title: "محصول اول",
      slug: "first",
      description: "محصول آزمایشی",
      price: 100,
      stock: 3,
      images: ["https://example.com/first.jpg"],
      category: new Types.ObjectId(),
    },
    {
      title: "محصول دوم",
      slug: "second",
      description: "محصول آزمایشی",
      price: 200,
      stock: 20,
      images: ["https://example.com/second.jpg"],
      category: new Types.ObjectId(),
    },
  ]);
  first = String(records[0]._id);
  second = String(records[1]._id);
});
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});

it("adds two guest products and preserves them on login, deleting the guest cart", async () => {
  await addToCart(guest, { product: first, quantity: 2 });
  await addToCart(guest, { product: second, quantity: 1 });
  await mergeGuestCart(user.user, guest.guestId);
  const cart = await getCart(user);
  expect(cart.items.map((item) => [item.product.id, item.quantity])).toEqual([
    [first, 2],
    [second, 1],
  ]);
  expect(cart.count).toBe(3);
  expect(await Cart.exists(guest)).toBeNull();
  await mergeGuestCart(user.user, guest.guestId);
  expect((await getCart(user)).count).toBe(3);
});
it("clamps additions, updates and merged quantities to stock and ten", async () => {
  await addToCart(user, { product: first, quantity: 2 });
  await addToCart(guest, { product: first, quantity: 2 });
  await addToCart(guest, { product: second, quantity: 10 });
  await mergeGuestCart(user.user, guest.guestId);
  expect((await getCart(user)).items.map((item) => item.quantity)).toEqual([
    3, 10,
  ]);
  await updateCartItem(user, { product: first, quantity: "۱" });
  expect((await getCart(user)).items[0].quantity).toBe(1);
  await updateCartItem(user, { product: first, quantity: 10 });
  expect((await getCart(user)).items[0].quantity).toBe(3);
});
it("uses current prices, warns about reduced stock and hides unavailable products", async () => {
  await addToCart(guest, { product: first, quantity: 3 });
  await addToCart(guest, { product: second, quantity: 1 });
  await Product.updateOne({ _id: first }, { price: 300, stock: 1 });
  await Product.updateOne({ _id: second }, { isActive: false });
  const cart = await getCart(guest);
  expect(cart.items).toHaveLength(1);
  expect(cart.warnings).toHaveLength(2);
  expect(cart.subtotal).toBe(300);
  expect(cart.shippingFee).toBe(50);
  expect(cart.total).toBe(350);
  await Product.deleteOne({ _id: first });
  expect((await getCart(guest)).items).toHaveLength(0);
  expect((await getCart(guest)).total).toBe(0);
});
it("rejects malformed and unavailable inputs and isolates owners", async () => {
  await expect(
    addToCart(guest, { product: first, quantity: 0 }),
  ).rejects.toThrow();
  await Product.updateOne({ _id: first }, { stock: 0 });
  await expect(
    addToCart(guest, { product: first, quantity: 1 }),
  ).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
  await addToCart(guest, { product: second, quantity: 1 });
  await removeFromCart(user, { product: second });
  expect((await getCart(guest)).count).toBe(1);
  await removeFromCart(guest, { product: second });
  expect((await getCart(guest)).count).toBe(0);
  await clearCart(guest);
  expect(await Cart.exists(guest)).toBeNull();
});
it("keeps simultaneous additions atomic and stores no prices", async () => {
  await addToCart(guest, { product: second, quantity: 1 });
  await Promise.all(
    Array.from({ length: 5 }, () =>
      addToCart(guest, { product: second, quantity: 1 }),
    ),
  );
  expect((await getCart(guest)).count).toBe(6);
  const stored = await Cart.findOne(guest).lean().orFail();
  expect(stored.items).toHaveLength(1);
  expect(stored.items[0]).not.toHaveProperty("price");
  expect(calculateShipping(999)).toBe(50);
  expect(calculateShipping(1000)).toBe(0);
});
