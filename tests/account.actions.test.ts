import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  update: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.user }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/services/user.service", () => ({
  updateProfile: mocks.update,
  changePassword: vi.fn(),
  addAddress: vi.fn(),
  manageAddress: vi.fn(),
}));
vi.mock("@/services/order.service", () => ({ cancelOrder: vi.fn() }));
import { accountAction } from "@/actions/account.actions";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "owner-id" });
});
it("uses the authenticated owner rather than a submitted user ID", async () => {
  const form = new FormData();
  form.set("operation", "profile");
  form.set("userId", "foreign-id");
  const result = await accountAction(undefined, form);
  expect(result.ok).toBe(true);
  expect(mocks.update).toHaveBeenCalledWith("owner-id", expect.any(Object));
});
it("does not expose raw database failures in logs or responses", async () => {
  const secret = "private-password-and-database-uri";
  mocks.update.mockRejectedValue(new Error(secret));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const form = new FormData();
    form.set("operation", "profile");
    const result = await accountAction(undefined, form);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(log).toHaveBeenCalledExactlyOnceWith("Account update failed");
  } finally {
    log.mockRestore();
  }
});
it("rejects unauthenticated updates before calling a service", async () => {
  mocks.user.mockRejectedValue(new Error("redirect"));
  const form = new FormData();
  form.set("operation", "profile");
  await expect(accountAction(undefined, form)).rejects.toThrow("redirect");
  expect(mocks.update).not.toHaveBeenCalled();
});
