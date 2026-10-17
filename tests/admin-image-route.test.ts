import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ guard: vi.fn(), upload: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.guard }));
vi.mock("@/services/image.service", () => ({ uploadImage: mocks.upload }));
import { POST } from "@/app/api/admin/images/route";

beforeEach(() => vi.resetAllMocks());
it("checks admin access before reading files", async () => {
  mocks.guard.mockRejectedValue(new Error("denied"));
  const request = new Request("http://localhost/api/admin/images", {
    method: "POST",
  });
  const read = vi.spyOn(request, "formData");
  await expect(POST(request)).rejects.toThrow("denied");
  expect(read).not.toHaveBeenCalled();
  expect(mocks.upload).not.toHaveBeenCalled();
});
it("rejects missing images before calling storage", async () => {
  const request = new Request("http://localhost/api/admin/images", {
    method: "POST",
    body: new FormData(),
  });
  expect((await POST(request)).status).toBe(400);
  expect(mocks.upload).not.toHaveBeenCalled();
});
it("returns the stored image URL", async () => {
  mocks.upload.mockResolvedValue({
    url: "/api/images/123456789012345678901234",
  });
  const form = new FormData();
  form.set("image", new File(["image"], "image.png", { type: "image/png" }));
  const response = await POST(
    new Request("http://localhost/api/admin/images", {
      method: "POST",
      body: form,
    }),
  );
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({
    data: { url: "/api/images/123456789012345678901234" },
  });
});
