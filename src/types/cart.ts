import type { ProductDTO } from "@/types/dto";

export type CartOwner =
  { user: string; guestId?: never } | { guestId: string; user?: never };
export interface CartView {
  items: { product: ProductDTO; quantity: number; lineTotal: number }[];
  warnings: string[];
  count: number;
  subtotal: number;
  shippingFee: number;
  total: number;
}
