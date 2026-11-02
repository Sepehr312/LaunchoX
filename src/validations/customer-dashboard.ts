import { z } from "zod";
import { orderQuerySchema } from "@/validations/order";

export const customerDashboardQuerySchema = orderQuerySchema.extend({
  view: z
    .enum(["dashboard", "orders", "addresses", "profile"])
    .default("dashboard"),
});
