import type { OrderStatus, PaymentStatus, PaymentMethod } from "@/types/domain";
import { orderLabels, paymentLabels } from "@/types/order-labels";
import styles from "@/components/customer/customer.module.css";
export function OrderBadge({
  status,
  payment = false,
  method,
}: {
  status: OrderStatus | PaymentStatus;
  payment?: boolean;
  method?: PaymentMethod;
}) {
  const cashOnDelivery =
    payment && method === "cash_on_delivery" && status === "unpaid";
  const tone = cashOnDelivery
    ? styles.pending
    : status === "paid" || status === "delivered"
      ? "text-success"
      : status === "failed" || status === "cancelled"
        ? "text-danger"
        : status === "pending" || status === "unpaid"
          ? styles.pending
          : "text-primary";
  const label = cashOnDelivery
    ? "پرداخت در محل"
    : payment
      ? paymentLabels[status as PaymentStatus]
      : status === "pending"
        ? "در انتظار پرداخت"
        : orderLabels[status as OrderStatus];
  return (
    <span
      className={`${styles.badge} ${tone} ${status === "processing" ? styles.processing : ""}`}
    >
      {label}
    </span>
  );
}
