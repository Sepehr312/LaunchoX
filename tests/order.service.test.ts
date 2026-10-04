import { expect, it, vi } from "vitest";
import { Types } from "mongoose";
import { Product } from "@/models/product";
import { Order } from "@/models/order";
import { Cart } from "@/models/cart";
import { User } from "@/models/user";
import { fixture, checkoutInput, refillCart } from "./order-fixture";
import {
  createOrderFromCart,
  cancelOrder,
  updateOrderStatus,
  expireStaleOrders,
  markOrderPaid,
  getOrderForUser,
  listOrdersAdmin,
  listOrdersForUser,
} from "@/services/order.service";
import { addAddress, getCheckoutAddresses } from "@/services/user.service";
import { addressInput } from "./fixtures";
import { orderStatuses } from "@/types/domain";

it("enforces every SPEC transition for paid and unpaid orders without mutating rejected orders", async () => {
  const allowed = {
    pending: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
  };
  for (const payment of ["paid", "unpaid"] as const) {
    for (const from of orderStatuses) {
      for (const to of orderStatuses) {
        await refillCart(1);
        await Product.updateMany({}, { stock: 100 });
        const order = await createOrderFromCart(fixture.user, checkoutInput());
        await Order.updateOne(
          { _id: order.id },
          { status: from, "payment.status": payment },
        );
        const permitted =
          (allowed[from] as string[]).includes(to) &&
          (to !== "processing" || payment === "paid");
        const stock = (await Product.findById(fixture.first).lean())?.stock;
        if (permitted) {
          const updated = await updateOrderStatus(
            { id: order.id, status: to },
            fixture.other,
          );
          expect(updated.status).toBe(to);
          expect(updated.statusHistory).toHaveLength(2);
          expect(updated.statusHistory[1].changedBy).toBe(fixture.other);
          expect((await Product.findById(fixture.first).lean())?.stock).toBe(
            stock! + (to === "cancelled" ? 1 : 0),
          );
        } else {
          await expect(
            updateOrderStatus({ id: order.id, status: to }, fixture.other),
          ).rejects.toMatchObject({ code: "CONFLICT" });
          const unchanged = await getOrderForUser(fixture.user, order.id);
          expect(unchanged.status).toBe(from);
          expect(unchanged.statusHistory).toHaveLength(1);
          expect((await Product.findById(fixture.first).lean())?.stock).toBe(
            stock,
          );
        }
      }
    }
  }
}, 30000);

it("reserves stock, snapshots current prices/address, empties cart and generates sequential DTOs", async () => {
  await Product.updateOne({ _id: fixture.first }, { price: 200000 });
  const order = await createOrderFromCart(fixture.user, {
    ...checkoutInput(),
    total: 1,
    user: fixture.other,
  });
  expect(order.orderNumber).toBe("LX-100001");
  expect(order.user).toBe(fixture.user);
  expect(order.items[0].price).toBe(200000);
  expect(order.items[0].image).toBe("/images/products/first.webp");
  expect(order.subtotal).toBe(550000);
  expect(order.shippingFee).toBe(50000);
  expect(order.total).toBe(600000);
  expect(order.status).toBe("pending");
  expect(order.payment.status).toBe("unpaid");
  expect(order.statusHistory).toHaveLength(1);
  expect(order.createdAt).toEqual(expect.any(String));
  expect((await Product.findById(fixture.first).lean())?.stock).toBe(3);
  expect(
    (await Cart.findOne({ user: fixture.user }).lean())?.items,
  ).toHaveLength(0);
  await Product.updateOne({ _id: fixture.first }, { price: 1 });
  await User.updateOne({ _id: fixture.user }, { "addresses.0.city": "شیراز" });
  const snapshot = await getOrderForUser(fixture.user, order.id);
  expect(snapshot.items[0].price).toBe(200000);
  expect(snapshot.shippingAddress.city).toBe("تهران");
  await refillCart(1);
  expect(
    (await createOrderFromCart(fixture.user, checkoutInput())).orderNumber,
  ).toBe("LX-100002");
});
it("rolls back earlier reservations when a later product is unavailable and preserves cart", async () => {
  await Product.updateOne({ _id: fixture.second }, { stock: 0 });
  await expect(
    createOrderFromCart(fixture.user, checkoutInput()),
  ).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
  expect((await Product.findById(fixture.first).lean())?.stock).toBe(5);
  expect(await Order.countDocuments()).toBe(0);
  expect(
    (await Cart.findOne({ user: fixture.user }).lean())?.items,
  ).toHaveLength(2);
  expect(
    (await Cart.findOne({ user: fixture.user }).lean())?.checkoutToken,
  ).toBeUndefined();
});
it("rejects excess quantities, empty carts, malformed inputs and another user's address", async () => {
  await refillCart(6);
  await expect(
    createOrderFromCart(fixture.user, checkoutInput()),
  ).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
  expect((await Product.findById(fixture.first).lean())?.stock).toBe(5);
  await expect(
    createOrderFromCart(fixture.user, {
      addressId: new Types.ObjectId().toString(),
    }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(
    createOrderFromCart("invalid", checkoutInput()),
  ).rejects.toThrow();
  await Cart.deleteMany({});
  await expect(
    createOrderFromCart(fixture.user, checkoutInput()),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("allows one simultaneous checkout of the same cart and does not oversell across users", async () => {
  const results = await Promise.allSettled([
    createOrderFromCart(fixture.user, checkoutInput()),
    createOrderFromCart(fixture.user, checkoutInput()),
  ]);
  expect(
    results.filter((result) => result.status === "fulfilled"),
  ).toHaveLength(1);
  expect(await Order.countDocuments()).toBe(1);
  expect((await Product.findById(fixture.first).lean())?.stock).toBe(3);
  const second = await User.create({
    name: "مشتری دوم",
    email: "second@example.com",
    passwordHash: "$2b$12$" + "a".repeat(53),
    addresses: [addressInput],
  });
  await Cart.create({
    user: second._id,
    items: [{ product: fixture.first, quantity: 4 }],
  });
  await expect(
    createOrderFromCart(String(second._id), {
      addressId: String(second.addresses[0]._id),
    }),
  ).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
  expect((await Product.findById(fixture.first).lean())?.stock).toBe(3);
});

it("atomically handles competing customer carts and assigns unique sequential order numbers", async () => {
  const customers = await User.create(
    Array.from({ length: 3 }, (_, index) => ({
      name: "مشتری آزمایشی",
      email: `race-${index}@example.com`,
      passwordHash: "$2b$12$" + "a".repeat(53),
      addresses: [addressInput],
    })),
  );
  await Cart.create(
    customers.map((customer) => ({
      user: customer._id,
      items: [{ product: fixture.first, quantity: 1 }],
    })),
  );
  const orders = await Promise.all(
    customers.map((customer) =>
      createOrderFromCart(String(customer._id), {
        addressId: String(customer.addresses[0]._id),
      }),
    ),
  );
  expect(orders.map((order) => order.orderNumber).sort()).toEqual([
    "LX-100001",
    "LX-100002",
    "LX-100003",
  ]);
  expect((await Product.findById(fixture.first).lean())?.stock).toBe(2);
});
it("restores stock once on customer cancellation and enforces ownership and transitions", async () => {
  const order = await createOrderFromCart(fixture.user, checkoutInput());
  await expect(getOrderForUser(fixture.other, order.id)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await expect(cancelOrder(fixture.other, order.id)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  for (const status of ["processing", "shipped", "delivered"])
    await expect(
      updateOrderStatus({ id: order.id, status }, fixture.other),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  const results = await Promise.allSettled([
    cancelOrder(fixture.user, order.id),
    cancelOrder(fixture.user, order.id),
  ]);
  expect(
    results.filter((result) => result.status === "fulfilled"),
  ).toHaveLength(1);
  expect((await Product.findById(fixture.first).lean())?.stock).toBe(5);
  expect(
    (await getOrderForUser(fixture.user, order.id)).statusHistory,
  ).toHaveLength(2);
  await expect(
    updateOrderStatus({ id: order.id, status: "pending" }, fixture.other),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("supports only paid processing -> shipped -> delivered and rejects cancellation after shipping", async () => {
  const order = await createOrderFromCart(fixture.user, checkoutInput());
  await markOrderPaid(order.id, "test-ref");
  await expect(cancelOrder(fixture.user, order.id)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await expect(
    updateOrderStatus({ id: order.id, status: "delivered" }, fixture.other),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await updateOrderStatus({ id: order.id, status: "shipped" }, fixture.other);
  await expect(
    updateOrderStatus({ id: order.id, status: "cancelled" }, fixture.other),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const delivered = await updateOrderStatus(
    { id: order.id, status: "delivered" },
    fixture.other,
  );
  expect(delivered.statusHistory).toHaveLength(4);
  await expect(
    updateOrderStatus({ id: order.id, status: "shipped" }, fixture.other),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("expires only old pending unpaid orders and runs expiry when listing admin orders", async () => {
  const old = await createOrderFromCart(fixture.user, checkoutInput());
  await refillCart(1);
  const paid = await createOrderFromCart(fixture.user, checkoutInput());
  await markOrderPaid(paid.id, "paid");
  await refillCart(1);
  const fresh = await createOrderFromCart(fixture.user, checkoutInput());
  await Order.collection.updateMany(
    { _id: { $in: [new Types.ObjectId(old.id), new Types.ObjectId(paid.id)] } },
    { $set: { createdAt: new Date(Date.now() - 31 * 60 * 1000) } },
  );
  await Promise.all([expireStaleOrders(), expireStaleOrders()]);
  expect((await getOrderForUser(fixture.user, old.id)).status).toBe(
    "cancelled",
  );
  expect((await getOrderForUser(fixture.user, paid.id)).status).toBe(
    "processing",
  );
  expect((await getOrderForUser(fixture.user, fresh.id)).status).toBe(
    "pending",
  );
  expect((await Product.findById(fixture.first).lean())?.stock).toBe(3);
  expect((await listOrdersAdmin()).total).toBe(3);
  expect((await listOrdersForUser(fixture.other)).total).toBe(0);
});
it("rolls back an order persistence failure and permits a retry", async () => {
  const spy = vi
    .spyOn(Order, "create")
    .mockRejectedValueOnce(new Error("storage failure"));
  await expect(
    createOrderFromCart(fixture.user, checkoutInput()),
  ).rejects.toThrow("storage failure");
  spy.mockRestore();
  expect((await Product.findById(fixture.first).lean())?.stock).toBe(5);
  expect(
    (await Cart.findOne({ user: fixture.user }).lean())?.items,
  ).toHaveLength(2);
  expect(
    (await createOrderFromCart(fixture.user, checkoutInput())).status,
  ).toBe("pending");
});

it("rejects a concurrent cart edit without discarding the new cart or reserving stock", async () => {
  const create = Order.create.bind(Order);
  const spy = vi
    .spyOn(Order, "create")
    .mockImplementationOnce(
      async (...args: Parameters<typeof Order.create>) => {
        await Cart.updateOne(
          { user: fixture.user },
          { $set: { "items.0.quantity": 1 } },
        );
        return create(...args);
      },
    );
  try {
    await expect(
      createOrderFromCart(fixture.user, checkoutInput()),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(
      (await Cart.findOne({ user: fixture.user }).lean())?.items[0].quantity,
    ).toBe(1);
    expect((await Product.findById(fixture.first).lean())?.stock).toBe(5);
    expect(await Order.countDocuments()).toBe(0);
  } finally {
    spy.mockRestore();
  }
});
it("adds checkout addresses with normalized digits, caps at five and isolates users", async () => {
  const addresses = await addAddress(fixture.user, {
    ...addressInput,
    mobile: "۰۹۱۲۳۴۵۶۷۸۹",
    postalCode: "۱۲۳۴۵۶۷۸۹۰",
    isDefault: true,
  });
  expect(addresses[1].mobile).toBe("09123456789");
  expect(addresses[0].isDefault).toBe(true);
  expect(addresses[1].isDefault).toBe(false);
  await Promise.all(
    Array.from({ length: 3 }, () => addAddress(fixture.user, addressInput)),
  );
  await expect(addAddress(fixture.user, addressInput)).rejects.toMatchObject({
    code: "CONFLICT",
  });
  expect(await getCheckoutAddresses(fixture.user)).toHaveLength(5);
  await expect(getCheckoutAddresses(fixture.other)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  connectDB: async () => (await import("mongoose")).default,
}));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    NODE_ENV: "test",
    PAYMENT_PROVIDER: "fake",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3019",
    FREE_SHIPPING_THRESHOLD: 1000000,
    SHIPPING_FLAT_FEE: 50000,
  }),
}));
