import "server-only";
import { getEnv } from "@/lib/env";
import { randomUUID } from "node:crypto";
import { Types, type QueryFilter } from "mongoose";
import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { toDTO } from "@/lib/model-shared";
import { Cart } from "@/models/cart";
import { Counter } from "@/models/counter";
import { Order, type IOrder } from "@/models/order";
import { Product } from "@/models/product";
import { User } from "@/models/user";
import { objectIdSchema } from "@/validations/common";
import {
  orderSchema,
  orderQuerySchema,
  updateOrderStatusSchema,
  authoritySchema,
  paymentReferenceSchema,
  orderNumberInput,
} from "@/validations/order";
import type { OrderDTO, PaginatedResult } from "@/types/dto";
import type { OrderStatus } from "@/types/domain";

async function readOrder(filter: QueryFilter<IOrder>): Promise<OrderDTO> {
  await connectDB();
  const order = await Order.findOne(filter).lean();
  if (!order) throw new AppError("سفارش پیدا نشد", "NOT_FOUND");
  return toDTO(order);
}

export async function getOrderForUser(userId: string, id: string) {
  return readOrder({
    _id: objectIdSchema.parse(id),
    user: objectIdSchema.parse(userId),
  });
}

export async function getOrderByNumberForUser(
  userId: string,
  orderNumber: string,
) {
  const { orderNumber: validNumber } = orderNumberInput.parse({ orderNumber });
  return readOrder({
    orderNumber: validNumber,
    user: objectIdSchema.parse(userId),
  });
}

export async function getOrderByAuthority(authority: string, userId: string) {
  return readOrder({
    "payment.authority": authoritySchema.parse(authority),
    user: objectIdSchema.parse(userId),
  });
}

export async function createOrderFromCart(
  userId: string,
  input: unknown,
): Promise<OrderDTO> {
  const user = objectIdSchema.parse(userId);
  const data = orderSchema.parse(input);
  await connectDB();
  await expireStaleOrders();
  const customer = await User.findOne({ _id: user, isActive: true }).lean();
  const address = customer?.addresses.find(
    (entry) => String(entry._id) === data.addressId,
  );
  if (!address) throw new AppError("آدرس ارسال پیدا نشد", "NOT_FOUND");
  const token = randomUUID();
  const cart = await Cart.findOneAndUpdate(
    { user, checkoutToken: { $exists: false }, "items.0": { $exists: true } },
    { $set: { checkoutToken: token } },
    { returnDocument: "after" },
  ).lean();
  if (!cart)
    throw new AppError(
      "سبد خالی است یا ثبت سفارش در حال انجام است",
      "CONFLICT",
    );
  const reserved: { product: Types.ObjectId; quantity: number }[] = [];
  let createdId: Types.ObjectId | undefined;
  try {
    const items = [];
    for (const item of cart.items) {
      const product = await Product.findOneAndUpdate(
        { _id: item.product, isActive: true, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { returnDocument: "after" },
      ).lean();
      if (!product) {
        const unavailable = await Product.findById(item.product)
          .select("title")
          .lean();
        throw new AppError(
          `موجودی «${unavailable?.title ?? "محصول حذف‌شده"}» کافی نیست؛ سبد را بررسی کنید`,
          "OUT_OF_STOCK",
        );
      }
      reserved.push({ product: item.product, quantity: item.quantity });
      items.push({
        product: item.product,
        title: product.title,
        slug: product.slug,
        image: product.images[0],
        price: product.price,
        quantity: item.quantity,
      });
    }
    const totals = calculateCartTotals(items);
    if (
      ![totals.subtotal, totals.shippingFee, totals.total].every(
        Number.isSafeInteger,
      )
    )
      throw new AppError("مبلغ سفارش خارج از محدودهٔ مجاز است", "VALIDATION");
    // Initialize once, then increment atomically; gaps after failed orders are harmless.
    await Counter.updateOne(
      { _id: "orders" },
      { $setOnInsert: { seq: 100000 } },
      { upsert: true },
    );
    const counter = await Counter.findOneAndUpdate(
      { _id: "orders" },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true },
    )
      .lean()
      .orFail();
    const { _id: addressId, ...shippingAddress } = address;
    void addressId;
    const order = await Order.create({
      user,
      orderNumber: `LX-${counter.seq}`,
      items,
      subtotal: totals.subtotal,
      shippingFee: totals.shippingFee,
      total: totals.total,
      shippingAddress,
      note: data.note,
      status: "pending",
      payment: { status: "unpaid" },
      statusHistory: [
        { status: "pending", changedAt: new Date(), changedBy: user },
      ],
    });
    createdId = order._id;
    // A cart edit during checkout must not be silently discarded.
    const cleared = await Cart.updateOne(
      {
        _id: cart._id,
        checkoutToken: token,
        updatedAt: cart.updatedAt,
        items: cart.items,
      },
      { $set: { items: [] }, $unset: { checkoutToken: 1 } },
    );
    if (!cleared.modifiedCount)
      throw new AppError(
        "سبد تغییر کرده است؛ دوباره سفارش را ثبت کنید",
        "CONFLICT",
      );
    return toDTO(order.toObject());
  } catch (error: unknown) {
    if (createdId) await Order.deleteOne({ _id: createdId });
    await restoreStock(reserved);
    throw error;
  } finally {
    await Cart.updateOne(
      { _id: cart._id, checkoutToken: token },
      { $unset: { checkoutToken: 1 } },
    );
  }
}

async function restoreStock(
  items: { product: Types.ObjectId; quantity: number }[],
) {
  if (items.length)
    await Product.bulkWrite(
      items.map((item) => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { stock: item.quantity } },
        },
      })),
    );
}

export async function getOrderAdmin(id: string) {
  return readOrder({ _id: objectIdSchema.parse(id) });
}

export async function getOrderCustomersAdmin(ids: string[]) {
  const validIds = ids.map((id) => objectIdSchema.parse(id));
  await connectDB();
  const customers = await User.find({ _id: { $in: validIds } })
    .select("name email mobile")
    .lean();
  return customers.map((customer) => ({
    id: String(customer._id),
    name: customer.name,
    email: customer.email,
    mobile: customer.mobile,
  }));
}

const transitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

async function transitionOrder(
  filter: QueryFilter<IOrder>,
  status: OrderStatus,
  changedBy?: string,
) {
  const current = await readOrder(filter);
  if (
    !transitions[current.status].includes(status) ||
    (status === "processing" && current.payment.status !== "paid")
  )
    throw new AppError("تغییر وضعیت سفارش مجاز نیست", "CONFLICT");
  const updated = await Order.findOneAndUpdate(
    {
      ...filter,
      status: current.status,
      "payment.status": current.payment.status,
    },
    {
      $set: { status },
      $push: { statusHistory: { status, changedAt: new Date(), changedBy } },
    },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!updated) throw new AppError("وضعیت سفارش تغییر کرده است", "CONFLICT");
  if (status === "cancelled") await restoreStock(updated.items);
  return toDTO(updated);
}

export async function updateOrderStatus(input: unknown, changedBy: string) {
  const data = updateOrderStatusSchema.parse(input);
  return transitionOrder(
    { _id: data.id },
    data.status,
    objectIdSchema.parse(changedBy),
  );
}

export async function cancelOrder(userId: string, id: string) {
  return transitionOrder(
    {
      _id: objectIdSchema.parse(id),
      user: objectIdSchema.parse(userId),
      status: "pending",
    },
    "cancelled",
    userId,
  );
}

export async function markOrderPaid(id: string, refId: string) {
  const orderId = objectIdSchema.parse(id);
  const reference = paymentReferenceSchema.parse(refId);
  await connectDB();
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: "pending", "payment.status": "unpaid" },
    {
      $set: {
        status: "processing",
        "payment.status": "paid",
        "payment.refId": reference,
        "payment.paidAt": new Date(),
      },
      $push: { statusHistory: { status: "processing", changedAt: new Date() } },
    },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!order) return getOrderAdmin(orderId);
  await Product.bulkWrite(
    order.items.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { soldCount: item.quantity } },
      },
    })),
  );
  return toDTO(order);
}

export async function markPaymentFailed(id: string) {
  const orderId = objectIdSchema.parse(id);
  await connectDB();
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: "pending", "payment.status": "unpaid" },
    {
      $set: { status: "cancelled", "payment.status": "failed" },
      $push: { statusHistory: { status: "cancelled", changedAt: new Date() } },
    },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!order) return getOrderAdmin(orderId);
  await restoreStock(order.items);
  return toDTO(order);
}

export async function expireStaleOrders() {
  await connectDB();
  const stale = await Order.find({
    status: "pending",
    "payment.status": "unpaid",
    createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) },
  })
    .select("_id")
    .lean();
  for (const order of stale) await markPaymentFailed(String(order._id));
}

async function listOrders(
  filter: QueryFilter<IOrder>,
  input: unknown,
): Promise<PaginatedResult<OrderDTO>> {
  const query = orderQuerySchema.parse(input);
  await connectDB();
  const match = {
    ...filter,
    ...(query.status ? { status: query.status } : {}),
  };
  const [orders, total] = await Promise.all([
    Order.find(match)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Order.countDocuments(match),
  ]);
  return {
    items: orders.map((order) => toDTO(order)),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function listOrdersForUser(userId: string, input: unknown = {}) {
  return listOrders({ user: objectIdSchema.parse(userId) }, input);
}
export async function listOrdersAdmin(input: unknown = {}) {
  await expireStaleOrders();
  return listOrders({}, input);
}

export async function attachOrderPayment(
  id: string,
  authority: string,
  provider: string,
) {
  await connectDB();
  const result = await Order.updateOne(
    {
      _id: objectIdSchema.parse(id),
      status: "pending",
      "payment.status": "unpaid",
    },
    {
      $set: {
        "payment.authority": authoritySchema.parse(authority),
        "payment.provider": paymentReferenceSchema.parse(provider),
      },
    },
  );
  if (!result.modifiedCount)
    throw new AppError("سفارش آمادهٔ پرداخت نیست", "CONFLICT");
}

export function calculateShipping(subtotal: number) {
  const env = getEnv();
  return subtotal >= env.FREE_SHIPPING_THRESHOLD ? 0 : env.SHIPPING_FLAT_FEE;
}

export async function getDashboardRevenue(from: Date, through: Date) {
  await connectDB();
  const result = await Order.aggregate<{ total: number }>([
    {
      $match: {
        "payment.status": "paid",
        "payment.paidAt": { $gte: from, $lte: through },
      },
    },
    { $group: { _id: null, total: { $sum: "$total" } } },
  ]);
  return result[0]?.total ?? 0;
}

export function calculateCartTotals(
  items: { price: number; quantity: number }[],
) {
  const lineTotals = items.map((item) => item.price * item.quantity);
  const subtotal = lineTotals.reduce((sum, value) => sum + value, 0);
  const shippingFee = items.length ? calculateShipping(subtotal) : 0;
  return { lineTotals, subtotal, shippingFee, total: subtotal + shippingFee };
}
