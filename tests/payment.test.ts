import { afterEach, expect, it, vi } from "vitest";
import { fixture, checkoutInput } from "./order-fixture";
import {
  startCheckout,
  completePayment,
} from "@/services/payment/payment.service";
import { fakeProvider } from "@/services/payment/fake.provider";
import {
  getOrderByAuthority,
  getOrderByNumberForUser,
  markPaymentFailed,
} from "@/services/order.service";
import { Product } from "@/models/product";
import { Order } from "@/models/order";
import { Cart } from "@/models/cart";
afterEach(() => vi.restoreAllMocks());
import { getEnv } from "@/lib/env";
import { zarinpalProvider } from "@/services/payment/zarinpal.provider";

it("pays once, uses database amount, increases soldCount once even under concurrent callbacks", async () => {
  const payment = await startCheckout(fixture.user, checkoutInput());
  expect(payment.redirectUrl).toContain("/checkout/fake-gateway?authority=");
  const verify = vi.spyOn(fakeProvider, "verifyPayment");
  const params = { authority: payment.authority, status: "OK", amount: "1" };
  const results = await Promise.all([
    completePayment(fixture.user, params),
    completePayment(fixture.user, params),
  ]);
  expect(results[0].payment.status).toBe("paid");
  expect(results[0].status).toBe("processing");
  expect(results[0].payment.refId).toContain("FAKE-");
  expect(results[0].payment.paidAt).toEqual(expect.any(String));
  expect(verify).toHaveBeenCalledWith({
    authority: payment.authority,
    amount: 500000,
    params: { authority: payment.authority, status: "OK" },
  });
  const calls = verify.mock.calls.length;
  await completePayment(fixture.user, params);
  expect(verify).toHaveBeenCalledTimes(calls);
  expect((await Product.findById(fixture.first).lean())?.soldCount).toBe(2);
  expect((await Product.findById(fixture.first).lean())?.stock).toBe(3);
  expect(
    (await getOrderByAuthority(payment.authority, fixture.user)).statusHistory,
  ).toHaveLength(2);
  verify.mockRestore();
});
it("cancels and restores reservations exactly once on failed payment and ignores a later OK callback", async () => {
  const payment = await startCheckout(fixture.user, checkoutInput());
  await Promise.all([
    completePayment(fixture.user, {
      authority: payment.authority,
      status: "NOK",
    }),
    completePayment(fixture.user, {
      authority: payment.authority,
      status: "NOK",
    }),
  ]);
  const order = await completePayment(fixture.user, {
    authority: payment.authority,
    status: "OK",
  });
  expect(order.payment.status).toBe("failed");
  expect(order.status).toBe("cancelled");
  expect((await Product.findById(fixture.first).lean())?.stock).toBe(5);
  expect((await Product.findById(fixture.first).lean())?.soldCount).toBe(0);
  await markPaymentFailed(order.id);
  expect((await Product.findById(fixture.first).lean())?.stock).toBe(5);
});
it("isolates callback and result ownership and rejects malformed inputs", async () => {
  const payment = await startCheckout(fixture.user, checkoutInput());
  await expect(
    completePayment(fixture.other, {
      authority: payment.authority,
      status: "OK",
    }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  const order = await getOrderByAuthority(payment.authority, fixture.user);
  await expect(
    getOrderByNumberForUser(fixture.other, order.orderNumber),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(
    completePayment(fixture.user, { authority: "bad", status: "OK" }),
  ).rejects.toThrow();
  await expect(
    completePayment(fixture.user, {
      authority: payment.authority,
      status: "bad",
    }),
  ).rejects.toThrow();
  expect(
    (await getOrderByAuthority(payment.authority, fixture.user)).payment.status,
  ).toBe("unpaid");
});
it("releases stock after gateway request failure", async () => {
  const spy = vi
    .spyOn(fakeProvider, "requestPayment")
    .mockRejectedValueOnce(new Error("gateway offline"));
  await expect(startCheckout(fixture.user, checkoutInput())).rejects.toThrow(
    "gateway offline",
  );
  spy.mockRestore();
  expect((await Product.findById(fixture.first).lean())?.stock).toBe(5);
  expect((await Order.findOne().lean())?.payment.status).toBe("failed");
});
it("disables fake request/verification/checkout in production without touching cart or stock", async () => {
  const envModule = await import("@/lib/env");
  const envSpy = vi
    .spyOn(envModule, "getEnv")
    .mockReturnValue({ ...getEnv(), NODE_ENV: "production" });
  await expect(
    startCheckout(fixture.user, checkoutInput()),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(
    fakeProvider.verifyPayment({
      authority: crypto.randomUUID(),
      amount: 1,
      params: { status: "OK" },
    }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(await Order.countDocuments()).toBe(0);
  expect(
    (await Cart.findOne({ user: fixture.user }).lean())?.items,
  ).toHaveLength(2);
  expect((await Product.findById(fixture.first).lean())?.stock).toBe(5);
  envSpy.mockRestore();
});
it("rejects payment of expired orders and leaves the real gateway unimplemented", async () => {
  const payment = await startCheckout(fixture.user, checkoutInput());
  await Order.collection.updateOne(
    { "payment.authority": payment.authority },
    { $set: { createdAt: new Date(Date.now() - 31 * 60 * 1000) } },
  );
  expect(
    (
      await completePayment(fixture.user, {
        authority: payment.authority,
        status: "OK",
      })
    ).status,
  ).toBe("cancelled");
  expect((await Product.findById(fixture.first).lean())?.stock).toBe(5);
  await expect(
    zarinpalProvider.requestPayment({
      orderId: fixture.user,
      amount: 1,
      description: "",
      callbackUrl: "",
    }),
  ).rejects.toThrow("پیاده‌سازی");
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
