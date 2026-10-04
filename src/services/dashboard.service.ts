import "server-only";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/order";
import { Product } from "@/models/product";
import { getDashboardRevenue } from "@/services/order.service";

export function getDashboardPeriod(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    timeZone: "Asia/Tehran",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (name: string) =>
    Number(parts.find((item) => item.type === name)?.value);
  const today = new Date(
    now.getTime() -
      ((part("hour") * 60 + part("minute")) * 60 + part("second")) * 1000 -
      now.getUTCMilliseconds(),
  );
  return {
    today,
    month: new Date(today.getTime() - (part("day") - 1) * 86400000),
    now,
  };
}

export async function getDashboardStats() {
  await connectDB();
  const { today, month, now } = getDashboardPeriod();
  const [
    todayOrders,
    monthlyRevenue,
    pendingOrders,
    lowStockCount,
    latestOrders,
    lowStockProducts,
  ] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: today, $lte: now } }),
    getDashboardRevenue(month, now),
    Order.countDocuments({ status: "pending" }),
    Product.countDocuments({ stock: { $lt: 5 } }),
    Order.find()
      .select(
        "orderNumber shippingAddress.recipientName createdAt total status payment.status",
      )
      .sort({ createdAt: -1, _id: -1 })
      .limit(10)
      .lean(),
    Product.find({ stock: { $lt: 5 } })
      .select("title stock isActive")
      .sort({ stock: 1, _id: 1 })
      .lean(),
  ]);
  return {
    todayOrders,
    monthlyRevenue,
    pendingOrders,
    lowStockCount,
    latestOrders: latestOrders.map((order) => ({
      id: String(order._id),
      orderNumber: order.orderNumber,
      customerName: order.shippingAddress.recipientName,
      createdAt: order.createdAt.toISOString(),
      total: order.total,
      status: order.status,
      paymentStatus: order.payment.status,
    })),
    lowStockProducts: lowStockProducts.map((product) => ({
      id: String(product._id),
      title: product.title,
      stock: product.stock,
      isActive: product.isActive,
    })),
  };
}
