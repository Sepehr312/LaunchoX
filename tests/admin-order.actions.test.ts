import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  update: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.guard }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/services/order.service", () => ({
  updateOrderStatus: mocks.update,
}));
import { orderStatusAction } from "@/actions/admin/order.actions";
import { AppError } from "@/lib/errors";
const id = "123456789012345678901234";
function form(status = "shipped", orderId = id) {
  const input = new FormData();
  input.set("id", orderId);
  input.set("status", status);
  input.set("changedBy", "attacker");
  return input;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.guard.mockResolvedValue({ id });
});
it("requires admin before validating inputs or updating orders", async () => {
  mocks.guard.mockRejectedValue(new Error("denied"));
  await expect(
    orderStatusAction(undefined, form("bad", "bad")),
  ).rejects.toThrow("denied");
  expect(mocks.update).not.toHaveBeenCalled();
});
it("rejects malformed IDs and statuses before invoking the service", async () => {
  for (const input of [form("shipped", "bad"), form("bad")])
    expect(await orderStatusAction(undefined, input)).toMatchObject({
      ok: false,
    });
  expect(mocks.update).not.toHaveBeenCalled();
});
it("reports forbidden transitions without revalidating", async () => {
  mocks.update.mockRejectedValue(
    new AppError("تغییر وضعیت سفارش مجاز نیست", "CONFLICT"),
  );
  expect(await orderStatusAction(undefined, form())).toEqual({
    ok: false,
    error: "تغییر وضعیت سفارش مجاز نیست",
  });
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
it("records the authenticated admin and revalidates after success", async () => {
  mocks.update.mockResolvedValue({ id });
  expect(await orderStatusAction(undefined, form())).toEqual({
    ok: true,
    data: { id },
  });
  expect(mocks.update).toHaveBeenCalledWith({ id, status: "shipped" }, id);
  expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
});
