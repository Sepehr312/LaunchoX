import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  revalidate: vi.fn(),
  rethrow: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.guard }));
vi.mock("next/navigation", () => ({ unstable_rethrow: mocks.rethrow }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/services/brand.service", () => ({
  createBrand: mocks.create,
  updateBrand: mocks.update,
  deleteBrand: mocks.remove,
}));
import { brandAction } from "@/actions/admin/brand.actions";
import { AppError } from "@/lib/errors";

const id = "507f1f77bcf86cd799439011";
beforeEach(() => vi.resetAllMocks());
function makeForm(operation: string) {
  const form = new FormData();
  form.set("operation", operation);
  form.set("id", id);
  form.set("name", "برند");
  return form;
}

it.each(["create", "edit", "delete"])(
  "guards %s before parsing or mutation",
  async (operation) => {
    mocks.guard.mockRejectedValue(new Error("denied"));
    await expect(brandAction(undefined, makeForm(operation))).rejects.toThrow(
      "denied",
    );
    for (const service of [mocks.create, mocks.update, mocks.remove])
      expect(service).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  },
);

it.each(["create", "edit", "delete"])(
  "dispatches %s and invalidates caches after success",
  async (operation) => {
    mocks.create.mockResolvedValue({ id });
    mocks.update.mockResolvedValue({ id });
    const form = makeForm(operation);
    form.set("order", "۲");
    form.set("isFeatured", "on");
    const input = expect.objectContaining({
      name: "برند",
      order: 2,
      isActive: false,
      isFeatured: true,
    });
    expect(await brandAction(undefined, form)).toEqual({
      ok: true,
      data: { id },
    });
    if (operation === "create")
      expect(mocks.create).toHaveBeenCalledWith(input);
    if (operation === "edit")
      expect(mocks.update).toHaveBeenCalledWith(id, input);
    if (operation === "delete") expect(mocks.remove).toHaveBeenCalledWith(id);
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
  },
);

it.each([
  ["invalid", "name", "برند"],
  ["delete", "id", "bad"],
  ["edit", "id", "bad"],
  ["create", "name", " "],
  ["edit", "website", "invalid"],
  ["create", "logo", "bad"],
])("rejects invalid action %s %s", async (operation, field, value) => {
  const form = makeForm(operation);
  form.set(field, value);
  expect(await brandAction(undefined, form)).toMatchObject({
    ok: false,
    fieldErrors: expect.any(Object),
  });
  for (const service of [mocks.create, mocks.update, mocks.remove])
    expect(service).not.toHaveBeenCalled();
  expect(mocks.revalidate).not.toHaveBeenCalled();
});

it.each(["CONFLICT", "NOT_FOUND"] as const)(
  "returns %s without invalidating caches",
  async (code) => {
    mocks.remove.mockRejectedValue(new AppError("خطای برند", code));
    expect(await brandAction(undefined, makeForm("delete"))).toEqual({
      ok: false,
      error: "خطای برند",
    });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  },
);

it("hides unexpected errors and preserves Next control flow", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    mocks.create.mockRejectedValue(new Error("private database details"));
    expect(await brandAction(undefined, makeForm("create"))).toEqual({
      ok: false,
      error: "ذخیرهٔ تغییرات انجام نشد؛ دوباره تلاش کنید",
    });
    expect(mocks.revalidate).not.toHaveBeenCalled();
    mocks.rethrow.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    await expect(brandAction(undefined, makeForm("create"))).rejects.toThrow(
      "NEXT_REDIRECT",
    );
  } finally {
    log.mockRestore();
  }
});
