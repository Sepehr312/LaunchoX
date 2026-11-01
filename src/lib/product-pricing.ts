import "server-only";
import { z } from "zod";
import type { ProductPricingDTO } from "@/types/pricing";

const amount = z
  .number({ error: "قیمت معتبر نیست" })
  .int("قیمت باید عدد صحیح باشد")
  .min(0, "قیمت نباید منفی باشد")
  .max(Number.MAX_SAFE_INTEGER, "قیمت خارج از محدودهٔ مجاز است");
const pricingSchema = z
  .object({
    price: amount,
    compareAtPrice: amount.optional(),
  })
  .refine(
    (value) =>
      value.compareAtPrice === undefined || value.compareAtPrice > value.price,
    {
      path: ["compareAtPrice"],
      message: "قیمت قبلی باید بیشتر از قیمت فروش باشد",
    },
  );

export function getProductPricing(input: unknown): ProductPricingDTO {
  const { price, compareAtPrice } = pricingSchema.parse(input);
  const originalPrice = compareAtPrice ?? price;
  const discountAmount = originalPrice - price;
  // Integer arithmetic preserves half-up rounding even near the safe-integer limit.
  const original = BigInt(originalPrice);
  const discountPercent =
    original === BigInt(0)
      ? 0
      : Number(
          (BigInt(discountAmount) * BigInt(200) + original) /
            (original * BigInt(2)),
        );
  return {
    originalPrice,
    finalPrice: price,
    discountAmount,
    discountPercent,
    hasDiscount: compareAtPrice !== undefined,
  };
}

// Sorting retains the unrounded ratio so close discounts keep their existing order.
export function productDiscountRatioExpression() {
  return {
    $cond: [
      {
        $and: [
          { $gt: ["$compareAtPrice", "$price"] },
          { $gt: ["$compareAtPrice", 0] },
        ],
      },
      { $subtract: [1, { $divide: ["$price", "$compareAtPrice"] }] },
      0,
    ],
  };
}
