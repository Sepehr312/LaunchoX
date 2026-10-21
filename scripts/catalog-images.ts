import { catalogCategories } from "./catalog-categories";

const categoryImages: Record<string, string> = Object.fromEntries(
  catalogCategories.map((category) => [category.slug, category.image]),
);
export function getCatalogCategoryImage(slug: string): string | undefined {
  const image = categoryImages[slug];
  return image ? `/images/preview/categories/${image}.png` : undefined;
}

export function getCatalogProductImage(slug: string, title: string) {
  if (slug === "home-kitchen") {
    if (title.includes("دوقلو")) return "/images/preview/categories/twin.png";
    if (title.includes("فریزر بالا"))
      return "/images/preview/categories/top-freezer.png";
    if (title.includes("فریزر پایین"))
      return "/images/preview/categories/bottom-freezer.png";
  }
  return getCatalogCategoryImage(slug);
}
