import { afterAll, beforeAll, beforeEach, vi } from "vitest";
import mongoose, { Types } from "mongoose";
import { startTestMongo } from "./mongo-server";
import { addressInput, userInput, productInput } from "./fixtures";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: async () => mongoose }));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    NODE_ENV: "test",
    PAYMENT_PROVIDER: "fake",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3019",
    FREE_SHIPPING_THRESHOLD: 1000000,
    SHIPPING_FLAT_FEE: 50000,
  }),
}));
import { User } from "@/models/user";
import { Product } from "@/models/product";
import { Cart } from "@/models/cart";
import { Order } from "@/models/order";
import { Counter } from "@/models/counter";

export const fixture = {
  user: "",
  other: new Types.ObjectId().toString(),
  address: "",
  first: "",
  second: "",
};
let server: Awaited<ReturnType<typeof startTestMongo>>;
beforeAll(async () => {
  server = await startTestMongo();
  await mongoose.connect(server.uri, {
    dbName: "launchox_order_test",
    bufferCommands: false,
  });
  await Promise.all([Order.init(), Counter.init(), Cart.init()]);
}, 180000);
beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Cart.deleteMany({}),
    Order.deleteMany({}),
    Counter.deleteMany({}),
  ]);
  const user = await User.create({ ...userInput, addresses: [addressInput] });
  fixture.user = String(user._id);
  fixture.address = String(user.addresses[0]._id);
  const products = await Product.create([
    { ...productInput, slug: "first", images: ["/images/products/first.webp"] },
    { ...productInput, title: "محصول دوم", slug: "second" },
  ]);
  fixture.first = String(products[0]._id);
  fixture.second = String(products[1]._id);
  await refillCart();
});
export async function refillCart(quantity = 2) {
  await Cart.findOneAndUpdate(
    { user: fixture.user },
    {
      $set: {
        items: [
          { product: fixture.first, quantity },
          { product: fixture.second, quantity: 1 },
        ],
      },
    },
    { upsert: true },
  );
}
export function checkoutInput() {
  return { addressId: fixture.address, note: "با دقت بسته‌بندی شود" };
}
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});
