import "server-only";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/order";
import { objectIdSchema } from "@/validations/common";

export async function getCustomerOrderCounts(userId: string) {
  const user = objectIdSchema.parse(userId);
  await connectDB();
  const [total, processing, shipped, delivered] = await Promise.all([
    Order.countDocuments({ user }),
    Order.countDocuments({ user, status: "processing" }),
    Order.countDocuments({ user, status: "shipped" }),
    Order.countDocuments({ user, status: "delivered" }),
  ]);
  return { total, processing, shipped, delivered };
}
