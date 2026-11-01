import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
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

it.each([undefined, "1"])(
  "bounds actual streamed bytes with Content-Length %s",
  async (length) => {
    let pulls = 0;
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls++;
        controller.enqueue(new Uint8Array(1024 * 1024));
      },
      cancel,
    });
    const request = new Request("http://localhost/api/admin/images", {
      method: "POST",
      body,
      duplex: "half",
      headers: {
        "content-type": "multipart/form-data; boundary=test",
        ...(length ? { "content-length": length } : {}),
      },
    } as RequestInit);
    expect((await POST(request)).status).toBe(413);
    expect(cancel).toHaveBeenCalled();
    expect(pulls).toBeLessThanOrEqual(8);
    expect(mocks.upload).not.toHaveBeenCalled();
  },
);

it("returns 413 for oversized files inside a bounded multipart body", async () => {
  const body = new FormData();
  body.set(
    "image",
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", {
      type: "image/png",
    }),
  );
  expect(
    (
      await POST(
        new Request("http://localhost/api/admin/images", {
          method: "POST",
          body,
        }),
      )
    ).status,
  ).toBe(413);
  expect(mocks.upload).not.toHaveBeenCalled();
});

it.each([undefined, "1", "999"])(
  "accepts a bounded upload with Content-Length %s",
  async (length) => {
    mocks.upload.mockResolvedValue({
      url: "/api/images/123456789012345678901234",
    });
    const body = new FormData();
    body.set("image", new File(["image"], "image.png", { type: "image/png" }));
    const headers = length ? { "content-length": length } : undefined;
    expect(
      (
        await POST(
          new Request("http://localhost/api/admin/images", {
            method: "POST",
            body,
            headers,
          }),
        )
      ).status,
    ).toBe(201);
  },
);

it("rejects declared oversized bodies before reading, malformed multipart, duplicates and cross-origin requests", async () => {
  const declared = new Request("http://localhost/api/admin/images", {
    method: "POST",
    headers: { "content-length": "99999999" },
  });
  expect((await POST(declared)).status).toBe(413);
  const malformed = new Request("http://localhost/api/admin/images", {
    method: "POST",
    headers: { "content-type": "multipart/form-data; boundary=test" },
    body: "broken",
  });
  expect((await POST(malformed)).status).toBe(400);
  const body = new FormData();
  body.append("image", new File(["a"], "a.png", { type: "image/png" }));
  body.append("image", new File(["b"], "b.png", { type: "image/png" }));
  expect(
    (
      await POST(
        new Request("http://localhost/api/admin/images", {
          method: "POST",
          body,
        }),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await POST(
        new Request("http://localhost/api/admin/images", {
          method: "POST",
          headers: { origin: "https://elsewhere.test" },
        }),
      )
    ).status,
  ).toBe(403);
  expect(mocks.upload).not.toHaveBeenCalled();
});
