import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.guard }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/services/category.service", () => ({
  createCategory: mocks.create,
  updateCategory: mocks.update,
  deleteCategory: mocks.remove,
}));
import { categoryAction } from "@/actions/admin/category.actions";
import { AppError } from "@/lib/errors";
beforeEach(() => vi.resetAllMocks());
it.each(["create", "edit", "delete"])(
  "guards %s before parsing or mutation",
  async (operation) => {
    mocks.guard.mockRejectedValue(new Error("denied"));
    const form = new FormData();
    form.set("operation", operation);
    await expect(categoryAction(undefined, form)).rejects.toThrow("denied");
    for (const service of [mocks.create, mocks.update, mocks.remove])
      expect(service).not.toHaveBeenCalled();
  },
);
it("rejects invalid identifiers and fields", async () => {
  const form = new FormData();
  form.set("operation", "delete");
  form.set("id", "bad");
  expect(await categoryAction(undefined, form)).toMatchObject({ ok: false });
  expect(mocks.remove).not.toHaveBeenCalled();
  form.set("operation", "create");
  form.set("name", "test");
  form.set("parent", "bad");
  expect(await categoryAction(undefined, form)).toMatchObject({ ok: false });
  expect(mocks.create).not.toHaveBeenCalled();
});
it("returns linked-category conflicts without invalidating pages", async () => {
  mocks.remove.mockRejectedValue(
    new AppError("دسته‌بندی دارای محصول یا زیردسته قابل حذف نیست", "CONFLICT"),
  );
  const form = new FormData();
  form.set("operation", "delete");
  form.set("id", "123456789012345678901234");
  expect(await categoryAction(undefined, form)).toMatchObject({
    ok: false,
    error: "دسته‌بندی دارای محصول یا زیردسته قابل حذف نیست",
  });
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
it("validates creation and invalidates storefront and admin", async () => {
  mocks.create.mockResolvedValue({ id: "123456789012345678901234" });
  const form = new FormData();
  form.set("operation", "create");
  form.set("name", "تازه");
  form.set("order", "۲");
  form.set("parent", "");
  form.set("isActive", "on");
  expect(await categoryAction(undefined, form)).toMatchObject({ ok: true });
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "تازه",
      order: 2,
      parent: undefined,
      isActive: true,
    }),
  );
  expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
});
