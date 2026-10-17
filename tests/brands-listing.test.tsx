import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BrandsListing } from "@/components/store/BrandsListing";
import { ProductForm } from "@/components/admin/ProductForm";
import { brandSearchSchema } from "@/validations/brand";
import { parseProductQuery } from "@/lib/product-query";
import BrandsPage, { metadata } from "@/app/(shop)/brands/page";

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/services/brand.service", () => ({ listStoreBrands: mocks.list }));
vi.mock("@/actions/admin/product.actions", () => ({ productAction: vi.fn() }));

it("disables inactive brands for new assignments and retains the existing inactive selection", () => {
  const brands = [{ id: "inactive", name: "برند غیرفعال", isActive: false }];
  const newForm = renderToStaticMarkup(
    <ProductForm categories={[]} brands={brands} />,
  );
  expect(newForm).toMatch(/<option[^>]*disabled=""[^>]*>برند غیرفعال/);
  const editForm = renderToStaticMarkup(
    <ProductForm categories={[]} brands={brands} brandId="inactive" />,
  );
  expect(editForm).toMatch(/<option value="برند غیرفعال" selected="">/);
  expect(editForm).toContain('name="brand" value="inactive"');
});

it("renders alphabetically sorted cards, logos, counts and encoded slug links", () => {
  const markup = renderToStaticMarkup(
    <BrandsListing
      brands={[
        {
          id: "b",
          name: "سامسونگ",
          slug: "سامسونگ",
          logo: "/images/samsung.svg",
          productCount: 2,
        },
        { id: "a", name: "اسنوا", slug: "snowa", productCount: 0 },
      ]}
    />,
  );
  expect(markup.indexOf("<h3>اسنوا")).toBeLessThan(
    markup.indexOf("<h3>سامسونگ"),
  );
  expect(markup).toContain("لوگوی سامسونگ");
  expect(markup).toContain("/images/samsung.svg");
  expect(markup).toContain("۲ محصول");
  expect(markup).toContain("۰ محصول");
  expect(markup).toContain(`/brands/${encodeURIComponent("سامسونگ")}`);
  expect(markup).toContain("/brands/snowa");
  expect(markup).toContain('aria-live="polite"');
});

it("renders a Persian empty state", () => {
  const markup = renderToStaticMarkup(<BrandsListing brands={[]} />);
  expect(markup).toContain("هنوز برندی برای نمایش وجود ندارد");
  expect(markup).toContain("۰ برند");
});

it.each([
  ["  SAM SUNG ", "samsung"],
  ["ال‌ جی", "الجی"],
  ["سامسونگ", "سامسونگ"],
  ["يخچال ك", "یخچالک"],
  ["general-electric", "generalelectric"],
])("normalizes Persian and English search %s", (value, expected) => {
  expect(brandSearchSchema.parse(value)).toBe(expected);
});

it("validates slug queries and keeps legacy filters compatible", () => {
  expect(
    parseProductQuery({ brandSlug: "samsung", brands: "Legacy" }),
  ).toMatchObject({
    success: true,
    data: { brandSlug: "samsung", brands: ["Legacy"] },
  });
  expect(parseProductQuery({ brandSlug: "../admin" }).success).toBe(false);
  expect(brandSearchSchema.safeParse("a".repeat(121)).success).toBe(false);
});

it("uses the public service without a session and exposes the production route", async () => {
  mocks.list.mockResolvedValue([]);
  const page = await BrandsPage();
  expect(page.props.brands).toEqual([]);
  expect(metadata.robots).toBeUndefined();
  mocks.list.mockRejectedValue(new Error("database offline"));
  await expect(BrandsPage()).rejects.toThrow("database offline");
});
