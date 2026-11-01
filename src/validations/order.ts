import { z } from "zod";
import { orderStatuses, paymentStatuses } from "@/types/domain";
import { normalizeDigits } from "@/lib/format";
import {
  objectIdSchema,
  optionalField,
  paginationSchema,
} from "@/validations/common";

export const orderSchema = z.object({
  addressId: objectIdSchema,
  note: optionalField(
    z.string().trim().max(500, "یادداشت باید حداکثر ۵۰۰ کاراکتر باشد"),
  ),
});
export const orderStatusSchema = z.enum(orderStatuses);
export const updateOrderStatusSchema = z.object({
  id: objectIdSchema,
  status: orderStatusSchema,
});
export const orderQuerySchema = paginationSchema.extend({
  status: orderStatusSchema.optional(),
});
export type OrderInput = z.infer<typeof orderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;

export const adminOrderQuerySchema = orderQuerySchema.extend({
  status: optionalField(orderStatusSchema),
  q: z
    .string()
    .trim()
    .max(100, "جستجو باید حداکثر ۱۰۰ کاراکتر باشد")
    .transform(normalizeDigits)
    .default(""),
  payment: optionalField(z.enum(paymentStatuses)),
  period: optionalField(z.enum(["7", "30", "90"])),
});
export type AdminOrderQuery = z.infer<typeof adminOrderQuerySchema>;

export const authoritySchema = z.string().uuid("شناسهٔ پرداخت معتبر نیست");
export const paymentReferenceSchema = z
  .string()
  .trim()
  .min(1, "شناسه الزامی است")
  .max(200, "شناسه بیش از حد طولانی است");
export const paymentCallbackSchema = z.object({
  authority: authoritySchema,
  status: z.enum(["OK", "NOK"], { error: "وضعیت پرداخت معتبر نیست" }),
});
export const orderNumberInput = z.object({
  orderNumber: z.string().regex(/^LX-\d{6,}$/, "شمارهٔ سفارش معتبر نیست"),
});
