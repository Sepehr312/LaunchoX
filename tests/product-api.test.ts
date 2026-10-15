import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
const { listProductsMock } = vi.hoisted(() => ({ listProductsMock: vi.fn() }));
vi.mock("@/services/product.service", () => ({
  listProducts: listProductsMock,
}));

import { GET } from "@/app/api/products/route";

describe("GET /api/products", () => {
  beforeEach(() => listProductsMock.mockReset());

  it("validates and forwards public product query parameters", async () => {
    listProductsMock.mockResolvedValue({
      items: [],
      page: 2,
      limit: 4,
      total: 0,
      totalPages: 0,
    });
    const response = await GET(
      new NextRequest(
        "http://localhost/api/products?page=2&limit=4&sort=price_desc&inStock=true&q=%DB%8C%D8%AE%DA%86%D8%A7%D9%84",
      ),
    );
    expect(response.status).toBe(200);
    expect(listProductsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 4,
        sort: "price_desc",
        inStock: true,
        q: "یخچال",
      }),
    );
    await expect(response.json()).resolves.toMatchObject({ data: { page: 2 } });
  });

  it("returns a Persian 400 error for invalid filters", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/products?page=0"),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/[\u0600-\u06ff]/);
    expect(listProductsMock).not.toHaveBeenCalled();
  });
  it("forwards repeated brand and energy values and the advanced filters", async () => {
    listProductsMock.mockResolvedValue({ items: [], total: 0 });
    const params = new URLSearchParams({
      capacity: "large",
      discounted: "true",
      sort: "discount",
    });
    params.append("brands", "ال‌جی");
    params.append("brands", "سامسونگ");
    params.append("energies", "A+");
    params.append("energies", "B");
    const response = await GET(
      new NextRequest(`http://localhost/api/products?${params}`),
    );
    expect(response.status).toBe(200);
    expect(listProductsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        brands: ["ال‌جی", "سامسونگ"],
        energies: ["A+", "B"],
        capacity: "large",
        discounted: true,
        sort: "discount",
      }),
    );
  });
});
