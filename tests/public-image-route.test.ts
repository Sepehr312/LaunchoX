import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/services/image.service", () => ({ getImage: mocks.get }));
import { GET } from "@/app/api/images/[id]/route";
beforeEach(() => vi.resetAllMocks());
const request = new Request("https://shop.test/api/images/123");
it("rejects invalid IDs before storage and returns 404 for missing images", async () => {
  expect(
    (await GET(request, { params: Promise.resolve({ id: "../../secret" }) }))
      .status,
  ).toBe(400);
  expect(mocks.get).not.toHaveBeenCalled();
  mocks.get.mockResolvedValue(null);
  expect(
    (
      await GET(request, {
        params: Promise.resolve({ id: "123456789012345678901234" }),
      })
    ).status,
  ).toBe(404);
});
it("serves original bytes with fixed image type, nosniff, sandbox and immutable caching", async () => {
  mocks.get.mockResolvedValue({
    data: new Uint8Array([1, 2, 3]),
    contentType: "image/png",
  });
  const response = await GET(request, {
    params: Promise.resolve({ id: "123456789012345678901234" }),
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/png");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("content-security-policy")).toContain("sandbox");
  expect(response.headers.get("cache-control")).toContain("immutable");
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(
    new Uint8Array([1, 2, 3]),
  );
});
