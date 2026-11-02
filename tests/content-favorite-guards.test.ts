import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  user: vi.fn(),
  save: vi.fn(),
  read: vi.fn(),
  merge: vi.fn(),
  set: vi.fn(),
  ids: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  requireAdmin: mocks.admin,
  requireUser: mocks.user,
}));
vi.mock("@/services/content.service", () => ({
  saveContent: mocks.save,
  readContent: mocks.read,
}));
vi.mock("@/services/favorite.service", () => ({
  mergeFavorites: mocks.merge,
  setFavorite: mocks.set,
  favoriteIds: mocks.ids,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { PUT, GET } from "@/app/api/pages/[slug]/route";
import { saveContentAction } from "@/actions/admin/content.actions";
import {
  setFavoriteAction,
  mergeFavoritesAction,
} from "@/actions/favorite.actions";
beforeEach(() => {
  vi.resetAllMocks();
});
it("guards all content writes before parsing or persistence", async () => {
  mocks.admin.mockRejectedValue(new Error("denied"));
  await expect(
    PUT(
      new Request("https://shop.test/api/pages/about", {
        method: "PUT",
        body: "{}",
      }),
      { params: Promise.resolve({ slug: "about" }) },
    ),
  ).rejects.toThrow("denied");
  await expect(saveContentAction({})).rejects.toThrow("denied");
  expect(mocks.save).not.toHaveBeenCalled();
});
it("does not expose inactive page content", async () => {
  mocks.read.mockResolvedValue({ key: "about", data: { isActive: false } });
  expect(
    (
      await GET(new Request("https://shop.test"), {
        params: Promise.resolve({ slug: "about" }),
      })
    ).status,
  ).toBe(404);
});
it("uses authenticated user ownership for favorite writes", async () => {
  mocks.user.mockResolvedValue({ id: "trusted" });
  await setFavoriteAction({ id: "product", liked: true, userId: "forged" });
  expect(mocks.set).toHaveBeenCalledWith("trusted", expect.anything());
  await mergeFavoritesAction(["product"]);
  expect(mocks.merge).toHaveBeenCalledWith("trusted", ["product"]);
  mocks.user.mockRejectedValue(new Error("denied"));
  await expect(setFavoriteAction({})).rejects.toThrow("denied");
});
