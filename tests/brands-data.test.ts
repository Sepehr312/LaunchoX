import { describe, expect, it } from "vitest";
import {
  brandHref,
  brandSearchSchema,
  brandSortSchema,
  selectBrands,
} from "@/components/store/brands-data";

const brands = [
  { name: "کریستال", slug: "کریستال", productCount: 2 },
  { name: "آیس‌لند", slug: "آیس-لند", productCount: 0 },
  { name: "نوردیک", slug: "nordic", productCount: 4 },
];

describe("brand listing discovery", () => {
  it("matches Persian variants, spaces, English aliases and slugs", () => {
    for (const query of ["آیس لند", "آيس‌لند", "ICE LAND"]) {
      expect(
        selectBrands(brands, query, "asc").map((brand) => brand.name),
      ).toEqual(["آیس‌لند"]);
    }
    expect(selectBrands(brands, "كريستال", "asc")[0]?.name).toBe("کریستال");
    expect(selectBrands(brands, "NORDIC", "asc")[0]?.slug).toBe("nordic");
  });
  it("sorts both directions without changing the source records", () => {
    const before = [...brands];
    const ascending = selectBrands(brands, "", "asc");
    expect(ascending.map((brand) => brand.name)).toEqual([
      "آیس‌لند",
      "کریستال",
      "نوردیک",
    ]);
    expect(selectBrands(brands, "", "desc")).toEqual([...ascending].reverse());
    expect(brands).toEqual(before);
  });
  it("returns an empty result without inventing records or counts", () => {
    expect(selectBrands(brands, "missing", "asc")).toEqual([]);
    expect(selectBrands([], "", "asc")).toEqual([]);
    expect(selectBrands(brands, "Iceland", "asc")[0]?.productCount).toBe(0);
  });
  it("encodes slug links and validates local inputs", () => {
    expect(decodeURIComponent(brandHref("آیس-لند"))).toBe("/brands/آیس-لند");
    expect(brandSearchSchema.safeParse("x".repeat(201)).success).toBe(false);
    expect(brandSortSchema.safeParse("invalid").success).toBe(false);
  });
});
