import { normalizeDigits } from "@/lib/format";

// This threshold only prompts review; it is not a market-price floor.
export const LOW_PRICE_WARNING_TOMAN = 1_000_000;

export function parsePriceForReview(value: string): number | null {
  const normalized = normalizeDigits(value.trim());
  if (!/^\d+$/.test(normalized)) return null;
  const price = Number(normalized);
  return Number.isSafeInteger(price) && price > 0 ? price : null;
}

export function needsPriceReview(
  price: number,
  originalPrice?: number,
  previousPrice?: number,
): boolean {
  return (
    price < LOW_PRICE_WARNING_TOMAN ||
    (originalPrice !== undefined && price <= originalPrice / 5) ||
    (previousPrice !== undefined &&
      price < previousPrice &&
      price <= previousPrice / 5)
  );
}
