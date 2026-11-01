import { Types } from "mongoose";
import { afterEach, expect, it, vi } from "vitest";
import { fixture, checkoutInput } from "./order-fixture";
import { Product } from "@/models/product";
import { Order } from "@/models/order";
import {
  createOrderFromCart,
  cancelOrder,
  updateOrderStatus,
  markPaymentFailed,
  expireStaleOrders,
} from "@/services/order.service";

afterEach(() => vi.restoreAllMocks());
it.each(["customer", "admin", "payment", "expiry"])(
  "rolls back %s cancellation and stock writes when bulkWrite fails",
  async (path) => {
    const before = await Product.find().sort({ _id: 1 }).lean();
    const order = await createOrderFromCart(fixture.user, checkoutInput());
    if (path === "expiry")
      await Order.collection.updateOne(
        { _id: new Types.ObjectId(order.id) },
        { $set: { createdAt: new Date(Date.now() - 3600000) } },
      );
    const stored = await Order.findById(order.id).lean();
    const reserved = await Product.find().sort({ _id: 1 }).lean();
    const cancel = () =>
      path === "customer"
        ? cancelOrder(fixture.user, order.id)
        : path === "admin"
          ? updateOrderStatus(
              { id: order.id, status: "cancelled" },
              fixture.user,
            )
          : path === "payment"
            ? markPaymentFailed(order.id)
            : expireStaleOrders();
    const realBulkWrite = Product.bulkWrite.bind(Product);
    const spy = vi
      .spyOn(Product, "bulkWrite")
      .mockImplementationOnce(async (operations, options) => {
        expect(options?.session?.inTransaction()).toBe(true);
        // Fail after a real write, so this also detects a missing session on stock updates.
        await realBulkWrite(operations, options);
        throw new Error("Injected bulkWrite failure");
      });
    if (path === "expiry") {
      const result = await expireStaleOrders();
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].message).toContain("Injected bulkWrite failure");
      expect(result.expired).toHaveLength(0);
    } else await expect(cancel()).rejects.toThrow("Injected bulkWrite failure");
    spy.mockRestore();
    expect(await Order.findById(order.id).lean()).toMatchObject({
      status: stored!.status,
      payment: stored!.payment,
      statusHistory: stored!.statusHistory,
    });
    expect(
      (await Product.find().sort({ _id: 1 }).lean()).map((p) => p.stock),
    ).toEqual(reserved.map((p) => p.stock));
    await cancel();
    expect((await Order.findById(order.id).lean())?.status).toBe("cancelled");
    expect(
      (await Product.find().sort({ _id: 1 }).lean()).map((p) => p.stock),
    ).toEqual(before.map((p) => p.stock));
    await markPaymentFailed(order.id);
    expect(
      (await Product.find().sort({ _id: 1 }).lean()).map((p) => p.stock),
    ).toEqual(before.map((p) => p.stock));
  },
);
