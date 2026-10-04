import "server-only";
import { getEnv } from "@/lib/env";

export function calculateShipping(subtotal: number) {
  const env = getEnv();
  return subtotal >= env.FREE_SHIPPING_THRESHOLD ? 0 : env.SHIPPING_FLAT_FEE;
}

export function calculateCartTotals(
  items: { price: number; quantity: number }[],
) {
  const lineTotals = items.map((item) => item.price * item.quantity);
  const subtotal = lineTotals.reduce((sum, value) => sum + value, 0);
  const shippingFee = items.length ? calculateShipping(subtotal) : 0;
  return { lineTotals, subtotal, shippingFee, total: subtotal + shippingFee };
}
