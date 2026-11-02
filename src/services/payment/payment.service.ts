import "server-only";
import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { getPaymentProvider } from "@/services/payment";
import {
  attachOrderPayment,
  createOrderFromCart,
  getOrderByAuthority,
  markOrderPaid,
  markPaymentFailed,
} from "@/services/order.service";
import { paymentCallbackSchema } from "@/validations/order";

export async function startCheckout(userId: string, input: unknown) {
  // Reject disabled providers before reserving stock or emptying the cart.
  const provider = getPaymentProvider();
  const order = await createOrderFromCart(userId, input);
  try {
    const payment = await provider.requestPayment({
      orderId: order.id,
      amount: order.total,
      description: `سفارش ${order.orderNumber}`,
      callbackUrl: new URL(
        "/api/payment/callback",
        getEnv().NEXT_PUBLIC_SITE_URL,
      ).href,
      mobile: order.shippingAddress.mobile,
    });
    await attachOrderPayment(order.id, payment.authority, provider.name);
    return payment;
  } catch (error: unknown) {
    await markPaymentFailed(order.id);
    throw error;
  }
}

export async function completePayment(userId: string, input: unknown) {
  const data = paymentCallbackSchema.parse(input);
  const provider = getPaymentProvider();
  let order = await getOrderByAuthority(data.authority, userId);
  if (order.payment.provider !== provider.name)
    throw new AppError("درگاه پرداخت سفارش معتبر نیست", "CONFLICT");
  if (order.payment.status === "paid" || order.status !== "pending")
    return order;
  if (Date.now() - new Date(order.createdAt).getTime() > 30 * 60 * 1000)
    return markPaymentFailed(order.id);
  const result = await provider.verifyPayment({
    authority: data.authority,
    amount: order.total,
    params: data,
  });
  order =
    result.success && result.refId
      ? await markOrderPaid(order.id, result.refId)
      : await markPaymentFailed(order.id);
  return order;
}
