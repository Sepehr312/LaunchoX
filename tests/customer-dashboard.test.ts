import { expect, it } from "vitest";
import { fixture, checkoutInput, refillCart } from "./order-fixture";
import { Order } from "@/models/order";
import {
  createOrderFromCart,
  getCustomerDashboardOrders,
} from "@/services/order.service";

it("returns an empty dashboard for a customer without orders", async () => {
  const dashboard = await getCustomerDashboardOrders(fixture.other);
  expect(dashboard.total).toBe(0);
  expect(dashboard.latest).toBeNull();
  expect(Object.values(dashboard.counts)).toEqual([0, 0, 0, 0, 0]);
});

it("counts all statuses, returns a serialized latest order and isolates each customer", async () => {
  const first = await createOrderFromCart(fixture.user, checkoutInput());
  await Order.updateOne(
    { _id: first.id },
    { $set: { status: "delivered", "payment.status": "paid" } },
  );
  await refillCart(1);
  const second = await createOrderFromCart(fixture.user, checkoutInput());
  await Order.updateOne(
    { _id: second.id },
    { $set: { status: "shipped", "payment.status": "paid" } },
  );
  const dashboard = await getCustomerDashboardOrders(fixture.user);
  expect(dashboard.total).toBe(2);
  expect(dashboard.counts).toEqual({
    pending: 0,
    processing: 0,
    shipped: 1,
    delivered: 1,
    cancelled: 0,
  });
  expect(dashboard.latest?.id).toBe(second.id);
  expect(dashboard.latest?.user).toBe(fixture.user);
  expect(typeof dashboard.latest?.createdAt).toBe("string");
  expect(dashboard.latest?.items[0].product).toBe(fixture.first);
  expect(await getCustomerDashboardOrders(fixture.other)).toMatchObject({
    total: 0,
    latest: null,
  });
  await expect(getCustomerDashboardOrders("invalid")).rejects.toThrow();
});

it("expires stale pending orders before displaying the current status", async () => {
  const order = await createOrderFromCart(fixture.user, checkoutInput());
  await Order.collection.updateOne(
    { orderNumber: order.orderNumber },
    { $set: { createdAt: new Date(Date.now() - 31 * 60 * 1000) } },
  );
  expect(await getCustomerDashboardOrders(fixture.user)).toMatchObject({
    total: 1,
    counts: { pending: 0, cancelled: 1 },
    latest: { status: "cancelled" },
  });
});
