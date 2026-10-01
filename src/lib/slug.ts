import { normalizeDigits } from "@/lib/format";

export function slugify(title: string): string {
  return (
    normalizeDigits(title)
      .normalize("NFKC")
      .toLowerCase()
      .trim()
      .replace(/[\s\u200c]+/gu, "-")
      .replace(/[^\p{L}\p{N}-]/gu, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "item"
  );
}

export async function createUniqueSlug(
  title: string,
  exists: (slug: string) => boolean | Promise<boolean>,
): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let suffix = 2;
  while (await exists(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}
