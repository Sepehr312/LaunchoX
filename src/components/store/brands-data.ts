import { z } from "zod";

export interface ListingBrand {
  name: string;
  slug: string;
  logo?: string;
  productCount: number;
}

// Search aliases for existing Persian brand names without an English name field.
const searchAliases: Readonly<Record<string, string>> = {
  آتلانتیس: "Atlantis",
  نوردیک: "Nordic",
  فروستیا: "Frostia",
  وینتر: "Winter",
  پولار: "Polar",
  آیس‌لند: "Iceland Ice land",
  کریستال: "Crystal",
  آرکتیک: "Arctic",
  مینی‌فراست: "Mini frost Minifrost",
  گلس‌کول: "Glass cool Glasscool",
};

export const brandSearchSchema = z.string().max(200);
export const brandSortSchema = z.enum(["asc", "desc"]);

function normalizeSearch(value: string) {
  return value
    .normalize("NFKC")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\s\u200c\u200d-]+/g, "")
    .toLocaleLowerCase("fa");
}

export function selectBrands(
  brands: ListingBrand[],
  query: string,
  sort: "asc" | "desc",
) {
  const needle = normalizeSearch(query);
  return brands
    .filter((brand) =>
      normalizeSearch(
        `${brand.name} ${brand.slug} ${searchAliases[brand.name] ?? ""}`,
      ).includes(needle),
    )
    .sort(
      (a, b) => (sort === "asc" ? 1 : -1) * a.name.localeCompare(b.name, "fa"),
    );
}

export function brandHref(slug: string) {
  return `/brands/${encodeURIComponent(slug)}`;
}
