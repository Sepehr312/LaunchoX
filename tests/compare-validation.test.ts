import { describe, expect, it } from "vitest";
import {
  compareIdsSchema,
  compareSearchSchema,
  compareUrlSchema,
  parseCompareIds,
  COMPARE_PAGE_LIMIT,
  COMPARE_RAW_ID_LIMIT,
} from "@/validations/compare";
import { comparisonHref } from "@/components/store/compare/comparison-selection";

const ids = Array.from({ length: 5 }, (_, i) =>
  (i + 10).toString(16).padStart(24, "0"),
);

describe("comparison pagination validation", () => {
  it.each([1, 2, COMPARE_PAGE_LIMIT])("accepts page %s", (page) => {
    expect(compareSearchSchema.parse({ page })).toEqual({ q: "", page });
  });
  it("defaults an omitted page and trims the search", () => {
    expect(compareSearchSchema.parse({ q: "  یخچال  " })).toEqual({
      q: "یخچال",
      page: 1,
    });
  });
  it.each(
    [
      0,
      -1,
      1.5,
      10000,
      COMPARE_PAGE_LIMIT + 1,
      Number.MAX_VALUE,
      NaN,
      Infinity,
      "invalid",
      "1",
      null,
      [],
      {},
      true,
    ].map((page, index) => ({ page, index })),
  )("rejects invalid page case $index", ({ page }) => {
    expect(compareSearchSchema.safeParse({ page }).success).toBe(false);
  });
  it("rejects oversized and non-string queries", () => {
    for (const q of ["x".repeat(101), { $ne: null }, []])
      expect(compareSearchSchema.safeParse({ q }).success).toBe(false);
  });
});

describe("comparison identifier validation", () => {
  it.each(
    [[], ids.slice(0, 1), ids.slice(0, 3), ids.slice(0, 4)].map(
      (selection) => ({ selection }),
    ),
  )(
    "accepts zero through four selected products: $selection",
    ({ selection }) => {
      expect(compareIdsSchema.parse(selection)).toEqual(selection);
    },
  );
  it("normalizes before deduplication and preserves first selection order", () => {
    const input = [ids[2].toUpperCase(), ` ${ids[0]} `, ids[2], ids[1], ids[0]];
    expect(compareIdsSchema.parse(input)).toEqual([ids[2], ids[0], ids[1]]);
    expect(compareUrlSchema.parse(input.join(","))).toEqual([
      ids[2],
      ids[0],
      ids[1],
    ]);
  });
  it("accepts the raw bound of duplicates and rejects one beyond it", () => {
    expect(
      compareIdsSchema.parse(Array(COMPARE_RAW_ID_LIMIT).fill(ids[0])),
    ).toEqual([ids[0]]);
    expect(
      compareIdsSchema.safeParse(Array(COMPARE_RAW_ID_LIMIT + 1).fill(ids[0]))
        .success,
    ).toBe(false);
    expect(
      parseCompareIds(Array(COMPARE_RAW_ID_LIMIT).fill(ids[0]).join(",")),
    ).toEqual([ids[0]]);
    expect(
      parseCompareIds(
        Array(COMPARE_RAW_ID_LIMIT + 1)
          .fill(ids[0])
          .join(","),
      ),
    ).toEqual([]);
  });
  it("rejects five distinct products after deduplication", () => {
    expect(compareIdsSchema.safeParse([...ids, ids[0]]).success).toBe(false);
    expect(parseCompareIds(ids.join(","))).toEqual([]);
  });
  it.each(
    [
      null,
      {},
      "",
      [""],
      ["  "],
      [123],
      [{ $ne: null }],
      [[ids[0]]],
      ["invalid"],
      [ids[0], ""],
      ["x".repeat(100000)],
      Array(10000).fill(ids[0]),
    ].map((input, index) => ({ input, index })),
  )("rejects malformed or oversized input case $index", ({ input }) => {
    expect(compareIdsSchema.safeParse(input).success).toBe(false);
  });
  it("uses an empty selection for missing, repeated or malformed URL parameters", () => {
    for (const input of [
      undefined,
      null,
      "",
      [ids[0]],
      `${ids[0]},`,
      "$ne:1",
      "x".repeat(100000),
    ])
      expect(parseCompareIds(input)).toEqual([]);
  });
  it("retains normalized selection order when building links, adding and removing", () => {
    const selected = compareIdsSchema.parse([
      ids[1].toUpperCase(),
      ids[0],
      ids[1],
    ]);
    const added = [...selected, ids[2]];
    const removed = added.filter((id) => id !== ids[0]);
    const href = comparisonHref(removed);
    expect(
      parseCompareIds(
        new URL(href, "http://localhost").searchParams.get("products"),
      ),
    ).toEqual([ids[1], ids[2]]);
  });
});
