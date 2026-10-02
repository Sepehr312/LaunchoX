import { z } from "zod";
import { objectIdSchema, quantitySchema } from "@/validations/common";

export const cartItemSchema = z.object({
  product: objectIdSchema,
  quantity: quantitySchema,
});
export const removeCartItemSchema = z.object({ product: objectIdSchema });
export const guestIdSchema = z.uuid({ error: "شناسهٔ سبد مهمان معتبر نیست" });
export type CartItemInput = z.infer<typeof cartItemSchema>;
export type RemoveCartItemInput = z.infer<typeof removeCartItemSchema>;
