import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ArcticProductCategories } from "@/components/preview/frostic/ArcticProductCategories";
import type { CategoryDTO } from "@/types/dto";

function categories(count: number): CategoryDTO[] {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index),
    name: `دستهٔ ${index}`,
    slug: `category-${index}`,
    order: index,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }));
}

it.each([0, 1, 7, 8, 9, 20])(
  "offers the directory from eight categories and limits the initial shortcuts for %i categories",
  (count) => {
    const html = renderToStaticMarkup(
      createElement(ArcticProductCategories, { categories: categories(count) }),
    );
    expect(html.includes('href="/categories"')).toBe(count >= 8);
    expect(html.match(/href="\/categories\/category-\d+"/g) ?? []).toHaveLength(
      Math.min(count, 8),
    );
  },
);
