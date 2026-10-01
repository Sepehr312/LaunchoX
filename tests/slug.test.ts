import { describe, expect, it, vi } from "vitest";
import { createUniqueSlug, slugify } from "@/lib/slug";

describe("slugify", () => {
  it.each([
    ["گوشی موبایل سامسونگ", "گوشی-موبایل-سامسونگ"],
    ["  کیف   ورزشی! (جدید)  ", "کیف-ورزشی-جدید"],
    ["کیف‌دستی", "کیف-دستی"],
    ["Laptop مدل ۱۲٣", "laptop-مدل-123"],
    ["---کتاب--داستان---", "کتاب-داستان"],
    ["کتاب 🎉 جدید", "کتاب-جدید"],
    ["", "item"],
    ["!!!", "item"],
  ])("creates a URL segment from %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
    expect(slugify(expected)).toBe(expected);
  });
});

describe("createUniqueSlug", () => {
  it("keeps an available slug unchanged", async () => {
    const exists = vi.fn(() => false);
    expect(await createUniqueSlug("کتاب داستان", exists)).toBe("کتاب-داستان");
    expect(exists).toHaveBeenCalledExactlyOnceWith("کتاب-داستان");
  });

  it("adds -2 to a duplicate Persian slug", async () => {
    expect(
      await createUniqueSlug("کتاب داستان", (slug) => slug === "کتاب-داستان"),
    ).toBe("کتاب-داستان-2");
  });

  it("awaits availability checks and skips multiple occupied suffixes", async () => {
    const occupied = new Set(["کتاب", "کتاب-2", "کتاب-3"]);
    expect(
      await createUniqueSlug("کتاب", async (slug) => occupied.has(slug)),
    ).toBe("کتاب-4");
  });

  it("does not treat a failed availability check as an available slug", async () => {
    await expect(
      createUniqueSlug("کتاب", async () => {
        throw new Error("Lookup failed");
      }),
    ).rejects.toThrow("Lookup failed");
  });
});
