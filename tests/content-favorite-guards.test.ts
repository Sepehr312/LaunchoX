import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  user: vi.fn(),
  save: vi.fn(),
  read: vi.fn(),
  mutate: vi.fn(),
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
  mutateAboutSection: mocks.mutate,
  mutateServicesSection: mocks.mutate,
}));
vi.mock("@/services/favorite.service", () => ({
  mergeFavorites: mocks.merge,
  setFavorite: mocks.set,
  favoriteIds: mocks.ids,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { PUT, GET } from "@/app/api/pages/[slug]/route";
import {
  mutateAboutSectionAction,
  saveAboutSectionAction,
  saveContentAction,
  mutateServicesSectionAction,
  saveServicesSectionAction,
} from "@/actions/admin/content.actions";
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
  await expect(mutateAboutSectionAction({})).rejects.toThrow("denied");
  await expect(saveAboutSectionAction({})).rejects.toThrow("denied");
  await expect(mutateServicesSectionAction({})).rejects.toThrow("denied");
  await expect(saveServicesSectionAction({})).rejects.toThrow("denied");
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.mutate).not.toHaveBeenCalled();
});
it("redirects service saves only after persistence and returns errors without redirecting", async () => {
  const section = {
    id: "service-one",
    title: "Service",
    description: "Description",
    imageUrl: "",
  };
  mocks.mutate.mockRejectedValueOnce(new Error("storage unavailable"));
  await expect(
    saveServicesSectionAction({ operation: "save", section }),
  ).resolves.toMatchObject({ ok: false });
  mocks.mutate.mockResolvedValueOnce(undefined);
  await expect(
    saveServicesSectionAction({ operation: "save", section }),
  ).rejects.toMatchObject({
    digest: expect.stringContaining("/admin/content?section=services"),
  });
});
it("redirects to the full preview only after saving a section", async () => {
  const input = {
    operation: "save",
    section: {
      id: "section-one",
      title: "عنوان",
      description: "توضیح",
      imageUrl: "",
    },
  };
  let finishSave: (() => void) | undefined;
  mocks.mutate.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finishSave = resolve;
      }),
  );
  const result = saveAboutSectionAction(input);
  const assertion = expect(result).rejects.toMatchObject({
    digest: expect.stringContaining("/admin/content?section=about"),
  });
  await vi.waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
  finishSave?.();
  await assertion;
});
it("keeps the section form open when validation or persistence fails", async () => {
  expect(
    (await saveAboutSectionAction({ operation: "delete", id: "section-one" }))
      ?.ok,
  ).toBe(false);
  expect(mocks.mutate).not.toHaveBeenCalled();
  mocks.mutate.mockRejectedValue(new Error("storage unavailable"));
  await expect(
    saveAboutSectionAction({
      operation: "save",
      section: {
        id: "section-one",
        title: "عنوان",
        description: "توضیح",
        imageUrl: "",
      },
    }),
  ).resolves.toMatchObject({ ok: false });
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
