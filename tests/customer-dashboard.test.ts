import { expect, it } from "vitest";
import { fixture } from "./order-fixture";
import { orderInput } from "./fixtures";
import { Order } from "@/models/order";
import { getCustomerOrderCounts } from "@/services/customer-dashboard.service";
import { customerDashboardQuerySchema } from "@/validations/customer-dashboard";

it("counts all customer orders without including another customer's orders", async () => {
  const statuses = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ] as const;
  await Order.create(
    statuses.map((status, index) => ({
      ...orderInput,
      user: fixture.user,
      status,
      orderNumber: `LX-${200000 + index}`,
    })),
  );
  await Order.create({
    ...orderInput,
    user: fixture.other,
    status: "shipped",
    orderNumber: "LX-300000",
  });
  expect(await getCustomerOrderCounts(fixture.user)).toEqual({
    total: 5,
    processing: 1,
    shipped: 1,
    delivered: 1,
  });
  expect(await getCustomerOrderCounts(fixture.other)).toEqual({
    total: 1,
    processing: 0,
    shipped: 1,
    delivered: 0,
  });
});

it("returns zero counts for an empty account and rejects invalid identifiers", async () => {
  expect(await getCustomerOrderCounts(fixture.user)).toEqual({
    total: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
  });
  await expect(getCustomerOrderCounts("invalid")).rejects.toThrow();
});

it("validates dashboard navigation and order filters", () => {
  expect(customerDashboardQuerySchema.parse({})).toMatchObject({
    view: "dashboard",
    page: 1,
  });
  for (const input of [
    { view: ["profile"] },
    { view: "invalid" },
    { page: "0" },
    { status: "invalid" },
  ]) {
    expect(customerDashboardQuerySchema.safeParse(input).success).toBe(false);
  }
});
