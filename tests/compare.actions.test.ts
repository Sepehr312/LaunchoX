import { beforeEach, expect, it, vi } from "vitest";

const { search } = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("@/services/product.service", () => ({
  searchComparisonProducts: search,
}));
vi.mock("@/lib/auth", () => ({
  requireUser: () => {
    throw new Error("Guest has no session");
  },
  requireAdmin: () => {
    throw new Error("Guest is not an administrator");
  },
}));
import { searchCompareAction } from "@/actions/compare.actions";

beforeEach(() => vi.resetAllMocks());

it("allows guest reads and strips unsolicited account and mutation fields", async () => {
  const result = { items: [], totalPages: 0 };
  search.mockResolvedValue(result);
  expect(
    await searchCompareAction({
      q: "  یخچال  ",
      user: "another-user",
      role: "admin",
      isActive: false,
      operation: "delete",
    }),
  ).toEqual(result);
  expect(search).toHaveBeenCalledExactlyOnceWith({ q: "یخچال", page: 1 });
});

it.each([
  { page: 0 },
  { page: 101 },
  { q: { $ne: null } },
  { page: "1" },
  null,
])("rejects invalid input before calling the service: %j", async (input) => {
  await expect(searchCompareAction(input)).rejects.toThrow();
  expect(search).not.toHaveBeenCalled();
});

it("propagates database failures to the existing picker retry state", async () => {
  search.mockRejectedValue(new Error("Unavailable test database"));
  await expect(searchCompareAction({})).rejects.toThrow(
    "Unavailable test database",
  );
});
