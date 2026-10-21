"use server";

import { searchComparisonProducts } from "@/services/product.service";
import { compareSearchSchema } from "@/validations/compare";

export async function searchCompareAction(input: unknown) {
  // Guest comparison only reads public catalog data; selection stays in the browser.
  return searchComparisonProducts(compareSearchSchema.parse(input));
}
