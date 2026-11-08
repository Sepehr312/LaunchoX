import { expect, it } from "vitest";
import { filterMobileInput, loginMobileSchema } from "@/validations/otp";

it("allows partial 09 numbers and supports Persian and Arabic digits", () => {
  for (const value of [
    "",
    "0",
    "09",
    "09123456789",
    "۰۹۱۲۳۴۵۶۷۸۹",
    "٠٩١٢٣٤٥٦٧٨٩",
  ])
    expect(filterMobileInput(value, "")).toBe(value);
});
it("removes nondigits, caps length and preserves the previous valid prefix", () => {
  expect(filterMobileInput("09abc12-3", "09")).toBe("09123");
  expect(filterMobileInput("09123456789000", "09")).toBe("09123456789");
  for (const value of ["1", "08", "0098", "+989123456789"])
    expect(filterMobileInput(value, "09")).toBe("09");
});
it.each([
  "+989123456789",
  "00989123456789",
  "0912345678a",
  "08123456789",
  "09123456789 ",
])("rejects bypassed nonlocal or nondigit input %s on the server", (value) => {
  expect(loginMobileSchema.safeParse(value).success).toBe(false);
});
