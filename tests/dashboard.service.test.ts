import { expect, it } from "vitest";
import { fixture, checkoutInput } from "./order-fixture";
import { Order } from "@/models/order";
import { Product } from "@/models/product";
import { createOrderFromCart } from "@/services/order.service";
import {
  getDashboardPeriod,
  getDashboardStats,
} from "@/services/dashboard.service";

it("uses Tehran midnight and Persian month boundaries across Nowruz", () => {
  const period = getDashboardPeriod(new Date("2026-03-21T00:15:00.123Z"));
  expect(period.today.toISOString()).toBe("2026-03-20T20:30:00.000Z");
  expect(period.month.toISOString()).toBe("2026-03-20T20:30:00.000Z");
  expect(
    getDashboardPeriod(new Date("2026-04-04T22:00:00Z")).today.toISOString(),
  ).toBe("2026-04-04T20:30:00.000Z");
});

it("returns empty orders and zero revenue without mutating inventory", async () => {
  const data = await getDashboardStats();
  expect(data.latestOrders).toEqual([]);
  expect(data.monthlyRevenue).toBe(0);
  expect(data.todayOrders).toBe(0);
  expect(
    await Product.findById(fixture.first).then((product) => product?.stock),
  ).toBe(5);
});

it("limits newest orders to three, sums paidAt revenue and includes inactive zero stock", async () => {
  const order = await createOrderFromCart(fixture.user, checkoutInput());
  const source = await Order.findById(order.id).lean().orFail();
  const { today, month } = getDashboardPeriod();
  await Order.collection.updateOne(
    { _id: source._id },
    {
      $set: {
        createdAt: new Date(today.getTime() - 1),
        "payment.status": "paid",
        "payment.paidAt": new Date(),
      },
    },
  );
  const copies = Array.from({ length: 11 }, (_, index) => ({
    ...source,
    _id: undefined,
    orderNumber: `LX-${200000 + index}`,
    createdAt: new Date(today.getTime() + index),
    payment: { status: "unpaid" },
  }));
  await Order.insertMany(copies);
  await Order.updateOne(
    { orderNumber: "LX-200000" },
    {
      $set: {
        "payment.status": "paid",
        "payment.paidAt": new Date(month.getTime() - 1),
      },
    },
  );
  await Product.updateOne(
    { _id: fixture.second },
    { stock: 0, isActive: false },
  );
  const data = await getDashboardStats();
  expect(data.monthlyRevenue).toBe(order.total);
  expect(data.todayOrders).toBe(11);
  expect(data.pendingOrders).toBe(12);
  expect(data.latestOrders.map((order) => order.orderNumber)).toEqual([
    "LX-200010",
    "LX-200009",
    "LX-200008",
  ]);
  expect(data.lowStockCount).toBe(2);
  expect(data.lowStockProducts[0]).toMatchObject({
    id: fixture.second,
    stock: 0,
    isActive: false,
  });
  expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  expect(await Order.countDocuments({ status: "pending" })).toBe(12);
});
