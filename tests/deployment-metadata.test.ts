import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ NEXT_PUBLIC_SITE_URL: "https://shop.example" }),
}));
vi.mock("@/services/category.service", () => ({ listCategories: vi.fn() }));
vi.mock("@/services/product.service", () => ({ listProducts: vi.fn() }));
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { listCategories } from "@/services/category.service";
import { listProducts } from "@/services/product.service";

describe("deployment metadata", () => {
  it("includes all product pages and excludes private routes", async () => {
    vi.mocked(listCategories).mockResolvedValue([]);
    vi.mocked(listProducts).mockResolvedValue({
      items: [],
      totalPages: 2,
      total: 0,
      page: 1,
      limit: 48,
    });
    const result = await sitemap();
    expect(listProducts).toHaveBeenCalledWith({
      page: 2,
      limit: 48,
      sort: "newest",
    });
    expect(result.map((entry) => entry.url)).toEqual([
      "https://shop.example/",
      "https://shop.example/products",
      "https://shop.example/categories",
    ]);
    expect(robots().sitemap).toBe("https://shop.example/sitemap.xml");
  });
  it("does not silently publish incomplete data on database failure", async () => {
    vi.mocked(listCategories).mockRejectedValue(new Error("unavailable"));
    await expect(sitemap()).rejects.toThrow("unavailable");
  });
});
