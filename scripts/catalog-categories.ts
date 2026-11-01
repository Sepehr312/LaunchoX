export const catalogCategories = [
  { slug: "twin", title: "یخچال فریزر دوقلو", image: "twin" },
  { slug: "clothing", title: "یخچال فرنچ دور", image: "french-door" },
  { slug: "top-freezer", title: "یخچال فریزر بالا", image: "top-freezer" },
  {
    slug: "bottom-freezer",
    title: "یخچال فریزر پایین",
    image: "bottom-freezer",
  },
  { slug: "digital", title: "یخچال ساید بای ساید", image: "side-by-side" },
  { slug: "home-kitchen", title: "یخچال فریزر کمبی", image: "combi" },
  { slug: "books", title: "یخچال هتلی و مینی", image: "mini" },
  { slug: "sports-travel", title: "یخچال فروشگاهی", image: "commercial" },
] as const;

export function splitRefrigeratorCategory(title: string): string {
  if (title.includes("دوقلو")) return "twin";
  if (title.includes("فریزر بالا")) return "top-freezer";
  if (title.includes("فریزر پایین")) return "bottom-freezer";
  return "home-kitchen";
}
