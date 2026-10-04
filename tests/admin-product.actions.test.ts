import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  active: vi.fn(),
  remove: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.guard }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/services/product.service", () => ({
  createProduct: mocks.create,
  updateProduct: mocks.update,
  setProductActive: mocks.active,
  deleteProduct: mocks.remove,
}));
import { productAction } from "@/actions/admin/product.actions";
beforeEach(() => vi.resetAllMocks());
it.each(["create", "edit", "active", "delete"])(
  "checks admin before parsing or mutating %s",
  async (operation) => {
    mocks.guard.mockRejectedValue(new Error("denied"));
    const form = new FormData();
    form.set("operation", operation);
    await expect(productAction(undefined, form)).rejects.toThrow("denied");
    for (const service of [
      mocks.create,
      mocks.update,
      mocks.active,
      mocks.remove,
    ])
      expect(service).not.toHaveBeenCalled();
  },
);
it("rejects malformed identifiers and active values before mutations", async () => {
  const form = new FormData();
  form.set("operation", "active");
  form.set("id", "bad");
  form.set("isActive", "true");
  expect(await productAction(undefined, form)).toMatchObject({ ok: false });
  form.set("id", "123456789012345678901234");
  form.set("isActive", "maybe");
  expect(await productAction(undefined, form)).toMatchObject({ ok: false });
  expect(mocks.active).not.toHaveBeenCalled();
});
it("updates activity and invalidates affected pages", async () => {
  const form = new FormData();
  form.set("operation", "active");
  form.set("id", "123456789012345678901234");
  form.set("isActive", "false");
  expect(await productAction(undefined, form)).toMatchObject({ ok: true });
  expect(mocks.active).toHaveBeenCalledWith("123456789012345678901234", false);
  expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
});
