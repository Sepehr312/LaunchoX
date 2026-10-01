import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatPrice,
  normalizeDigits,
  toPersianDigits,
} from "@/lib/format";

describe("formatPrice", () => {
  it("formats integer toman amounts with Persian digits and grouping", () => {
    expect(formatPrice(1250000)).toBe("۱٬۲۵۰٬۰۰۰ تومان");
    expect(formatPrice(0)).toBe("۰ تومان");
  });

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid amounts: %s",
    (value) => {
      expect(() => formatPrice(value)).toThrow(
        "مبلغ باید عدد صحیح نامنفی و معتبر باشد.",
      );
    },
  );
});

describe("normalizeDigits", () => {
  it.each([
    ["۰۱۲۳۴۵۶۷۸۹", "0123456789"],
    ["٠١٢٣٤٥٦٧٨٩", "0123456789"],
    ["کد 12۳٤ و -۵.۶", "کد 1234 و -5.6"],
    ["", ""],
    ["hello 012", "hello 012"],
  ])("normalizes %s without changing other characters", (input, expected) => {
    expect(normalizeDigits(input)).toBe(expected);
  });
});

describe("toPersianDigits", () => {
  it("converts Latin and Arabic digits while preserving text", () => {
    expect(toPersianDigits("کد 012٣٤۵۶۷۸۹")).toBe("کد ۰۱۲۳۴۵۶۷۸۹");
    expect(toPersianDigits(-12.5)).toBe("-۱۲.۵");
    expect(toPersianDigits(0)).toBe("۰");
    expect(toPersianDigits("")).toBe("");
  });
});

describe("formatDate", () => {
  it("formats Nowruz in the Persian calendar", () => {
    expect(formatDate("2024-03-20T12:00:00Z")).toBe("۱ فروردین ۱۴۰۳");
  });

  it("accepts Date objects and timestamps", () => {
    const date = new Date("2024-03-20T12:00:00Z");
    expect(formatDate(date)).toBe("۱ فروردین ۱۴۰۳");
    expect(formatDate(date.getTime())).toBe("۱ فروردین ۱۴۰۳");
  });

  it("uses Tehran's date near midnight rather than the server timezone", () => {
    expect(formatDate("2024-03-19T21:00:00Z")).toBe("۱ فروردین ۱۴۰۳");
    expect(formatDate("2024-03-19T20:00:00Z")).toBe("۲۹ اسفند ۱۴۰۲");
  });

  it("rejects invalid dates with a Persian message", () => {
    expect(() => formatDate("invalid")).toThrow("تاریخ معتبر نیست.");
    expect(() => formatDate(new Date(NaN))).toThrow("تاریخ معتبر نیست.");
  });
});
