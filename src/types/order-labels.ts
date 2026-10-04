import type { OrderStatus, PaymentStatus } from "@/types/domain";
export const orderLabels: Record<OrderStatus, string> = {
  pending: "در انتظار پرداخت",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};
export const paymentLabels: Record<PaymentStatus, string> = {
  refunded: "بازپرداخت شده",
  unpaid: "پرداخت نشده",
  paid: "پرداخت شده",
  failed: "پرداخت ناموفق",
};
