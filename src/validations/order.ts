import { z } from "zod";
import { orderStatuses } from "@/types/domain";
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
