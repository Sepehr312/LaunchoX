import { describe, expect, it } from "vitest";
import {
  compareValuesDiffer,
  displayCompareValue,
  normalizeCompareValue,
  buildCompareGroups,
} from "@/components/store/compare/compare-data";
import { parseCompareIds } from "@/validations/compare";
import { vi } from "vitest";
import { getProductPricing } from "@/lib/product-pricing";
vi.mock("server-only", () => ({}));
import type { CompareProductDTO } from "@/types/dto";

const comparisonFixtures: CompareProductDTO[] = ["600 لیتر", "520 لیتر"].map(
  (capacity, index) => ({
    id: `00000000000000000000000${index + 1}`,
    title: "محصول نمونهٔ آزمون",
    slug: `comparison-test-${index + 1}`,
    price: 100000,
    pricing: getProductPricing({ price: 100000 }),
    stock: 1,
    images: ["/images/products/side-by-side.png"],
    category: {
      id: "000000000000000000000010",
      name: "یخچال",
      slug: "refrigerator",
    },
    attributes: [
      { key: "ظرفیت", value: capacity, createdAt: "", updatedAt: "" },
    ],
    createdAt: "",
    updatedAt: "",
  }),
);

describe("comparison input and quantities", () => {
  it("rejects invalid, repeated query parameters and oversized selections", () => {
    expect(parseCompareIds("$ne:1")).toEqual([]);
    expect(parseCompareIds(["000000000000000000000001"])).toEqual([]);
    expect(
      parseCompareIds(
        Array.from({ length: 5 }, (_, i) =>
          String(i + 1).padStart(24, "0"),
        ).join(","),
      ),
    ).toEqual([]);
    expect(
      parseCompareIds("000000000000000000000001,000000000000000000000001"),
    ).toEqual(["000000000000000000000001"]);
  });
  it("compares Persian/Arabic digits and equivalent quantities across units", () => {
    expect(compareValuesDiffer(["۱۷۹ سانتی‌متر", "1790 mm", "١٫٧٩ متر"])).toBe(
      false,
    );
    expect(compareValuesDiffer(["600 لیتر", "600000 ml"])).toBe(false);
    expect(compareValuesDiffer(["24 ماه", "2 سال"])).toBe(false);
    expect(compareValuesDiffer(["1 کیلوگرم", "1000 گرم"])).toBe(false);
  });
  it("keeps unknown values distinct from false and zero", () => {
    expect(compareValuesDiffer([undefined, "ندارد"])).toBe(true);
    expect(compareValuesDiffer([undefined, "0"])).toBe(true);
    expect(compareValuesDiffer([undefined, undefined])).toBe(false);
    expect(compareValuesDiffer(["true", "دارد"])).toBe(false);
    expect(compareValuesDiffer(["600 لیتر", "600 فوت"])).toBe(true);
    expect(compareValuesDiffer(["A++"])).toBe(false);
    expect(displayCompareValue(undefined)).toBe("ثبت نشده");
    expect(displayCompareValue("false")).toBe("ندارد");
    expect(normalizeCompareValue("  ")).toBe("missing");
  });
  it("maps actual attributes, preserves extra fields and does not invent missing values", () => {
    const products = comparisonFixtures.slice(0, 2);
    const groups = buildCompareGroups(products);
    expect(
      groups.find((group) => group.title === "ظرفیت و گنجایش")?.rows[0].values,
    ).toEqual(["600 لیتر", "520 لیتر"]);
    expect(
      groups.find((group) => group.title === "ابعاد و وزن")?.rows[1].values,
    ).toEqual([undefined, undefined]);
    const extra = {
      ...products[0],
      attributes: [
        ...products[0].attributes,
        {
          key: "روشنایی داخلی",
          value: "ال‌ای‌دی",
          createdAt: "",
          updatedAt: "",
        },
      ],
    };
    expect(buildCompareGroups([extra]).at(-1)?.rows[0].label).toBe(
      "روشنایی داخلی",
    );
  });
});
