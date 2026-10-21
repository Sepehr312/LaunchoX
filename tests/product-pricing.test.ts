import { describe, expect, it, vi } from "vitest";
import { getProductPricing } from "@/lib/product-pricing";
import * as envModule from "@/lib/env";
import {
  calculateCartTotals,
  calculateShipping,
} from "@/services/order.service";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    FREE_SHIPPING_THRESHOLD: 1000000,
    SHIPPING_FLAT_FEE: 50000,
  }),
}));

describe("server product pricing", () => {
  it.each([0, 1, 150000, Number.MAX_SAFE_INTEGER])(
    "keeps an undiscounted price of %s unchanged",
    (price) => {
      expect(getProductPricing({ price })).toEqual({
        originalPrice: price,
        finalPrice: price,
        discountAmount: 0,
        discountPercent: 0,
        hasDiscount: false,
      });
    },
  );
  it("derives the discount without discounting the selling price a second time", () => {
    expect(getProductPricing({ price: 75000, compareAtPrice: 100000 })).toEqual(
      {
        originalPrice: 100000,
        finalPrice: 75000,
        discountAmount: 25000,
        discountPercent: 25,
        hasDiscount: true,
      },
    );
    expect(
      getProductPricing({ price: 0, compareAtPrice: 100 }).discountPercent,
    ).toBe(100);
  });
  it.each([
    undefined,
    {},
    { price: null },
    { price: "100" },
    { price: -1 },
    { price: 0.1 },
    { price: NaN },
    { price: Infinity },
    { price: Number.MAX_SAFE_INTEGER + 1 },
    { price: 0, compareAtPrice: 0 },
    { price: 100, compareAtPrice: 100 },
    { price: 101, compareAtPrice: 100 },
    { price: 1, compareAtPrice: -1 },
    { price: 1, compareAtPrice: null },
    { price: 1, compareAtPrice: NaN },
    { price: 1, compareAtPrice: Infinity },
    { price: 1, compareAtPrice: 1.5 },
  ])("rejects invalid or incomplete stored pricing %j", (input) => {
    expect(() => getProductPricing(input)).toThrow();
  });
  it.each([
    [199, 200, 1],
    [198, 200, 1],
    [197, 200, 2],
    [9999, 10000, 0],
    [35400000, 36900000, 4],
    [8827055269646171, 9007199254740991, 2],
  ])(
    "rounds %s of %s to %s percent with exact half-up arithmetic",
    (price, compareAtPrice, expected) => {
      expect(getProductPricing({ price, compareAtPrice }).discountPercent).toBe(
        expected,
      );
    },
  );
});

describe("authoritative cart and order arithmetic", () => {
  it("rejects overflow when shipping is added to a valid subtotal", () => {
    const env = envModule.getEnv();
    const spy = vi
      .spyOn(envModule, "getEnv")
      .mockReturnValue({
        ...env,
        FREE_SHIPPING_THRESHOLD: Number.MAX_SAFE_INTEGER,
        SHIPPING_FLAT_FEE: 2,
      });
    try {
      expect(() =>
        calculateCartTotals([
          { price: Number.MAX_SAFE_INTEGER - 1, quantity: 1 },
        ]),
      ).toThrow();
    } finally {
      spy.mockRestore();
    }
  });
  it("keeps an empty cart free and charges the configured shipping boundary", () => {
    expect(calculateCartTotals([])).toEqual({
      lineTotals: [],
      subtotal: 0,
      shippingFee: 0,
      total: 0,
    });
    expect(calculateShipping(999999)).toBe(50000);
    expect(calculateShipping(1000000)).toBe(0);
    expect(
      calculateCartTotals([
        { price: 75000, quantity: 2 },
        { price: 1, quantity: 3 },
      ]),
    ).toEqual({
      lineTotals: [150000, 3],
      subtotal: 150003,
      shippingFee: 50000,
      total: 200003,
    });
  });
  it("accepts the largest exact total", () => {
    expect(
      calculateCartTotals([{ price: Number.MAX_SAFE_INTEGER, quantity: 1 }])
        .total,
    ).toBe(Number.MAX_SAFE_INTEGER);
  });
  it.each(
    [
      [{ price: -1, quantity: 1 }],
      [{ price: 0.1, quantity: 1 }],
      [{ price: NaN, quantity: 1 }],
      [{ price: Infinity, quantity: 1 }],
      [{ price: 1, quantity: 0 }],
      [{ price: 1, quantity: -1 }],
      [{ price: 1, quantity: 1.5 }],
      [{ price: 1, quantity: 11 }],
      [{ price: Number.MAX_SAFE_INTEGER, quantity: 2 }],
      [
        { price: Number.MAX_SAFE_INTEGER, quantity: 1 },
        { price: 1, quantity: 1 },
      ],
    ].map((items) => ({ items })),
  )("rejects invalid lines and overflow %j", ({ items }) => {
    expect(() => calculateCartTotals(items)).toThrow();
  });
});
