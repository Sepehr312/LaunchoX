"use server";

import { searchComparisonProducts } from "@/services/product.service";
import { compareSearchSchema } from "@/validations/compare";

export async function searchCompareAction(input: unknown) {
  return searchComparisonProducts(compareSearchSchema.parse(input));
}
