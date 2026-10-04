import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  update: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.guard }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/services/admin-user.service", () => ({
  setUserActive: mocks.update,
}));
import { userActiveAction } from "@/actions/admin/user.actions";
import { AppError } from "@/lib/errors";
const id = "507f1f77bcf86cd799439011";
function form(active = "false", userId = id) {
  const data = new FormData();
  data.set("id", userId);
  data.set("isActive", active);
  data.set("role", "admin");
  data.set("actorId", "attacker");
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.guard.mockResolvedValue({ id });
});
it("authorizes before validation or mutation", async () => {
  mocks.guard.mockRejectedValue(new Error("denied"));
  await expect(userActiveAction(undefined, form("bad", "bad"))).rejects.toThrow(
    "denied",
  );
  expect(mocks.update).not.toHaveBeenCalled();
});
it("rejects malformed and missing IDs or activity values", async () => {
  for (const data of [form("bad"), form("false", "bad"), new FormData()])
    expect(await userActiveAction(undefined, data)).toMatchObject({
      ok: false,
    });
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
it("passes only validated activity fields and refreshes admin pages", async () => {
  mocks.update.mockResolvedValue({ id });
  expect(await userActiveAction(undefined, form())).toEqual({
    ok: true,
    data: { id },
  });
  expect(mocks.update).toHaveBeenCalledWith({ id, isActive: false });
  expect(mocks.revalidate).toHaveBeenCalledWith("/admin", "layout");
});
it("reports self-deactivation rejection without refreshing", async () => {
  mocks.update.mockRejectedValue(
    new AppError("نمی‌توانید حساب خودتان را غیرفعال کنید", "CONFLICT"),
  );
  expect(await userActiveAction(undefined, form())).toEqual({
    ok: false,
    error: "نمی‌توانید حساب خودتان را غیرفعال کنید",
  });
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
