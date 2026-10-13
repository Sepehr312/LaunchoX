import type { OrderStatus, PaymentStatus } from "@/types/domain";
import { orderLabels, paymentLabels } from "@/types/order-labels";
import styles from "@/components/customer/customer.module.css";
export function OrderBadge({
  status,
  payment = false,
}: {
  status: OrderStatus | PaymentStatus;
  payment?: boolean;
}) {
  const tone =
    status === "paid" || status === "delivered"
      ? "text-success"
      : status === "failed" || status === "cancelled"
        ? "text-danger"
        : status === "pending" || status === "unpaid"
          ? styles.pending
          : "text-primary";
  const label = payment
    ? paymentLabels[status as PaymentStatus]
    : status === "pending"
      ? "در انتظار پرداخت"
      : orderLabels[status as OrderStatus];
  return <span className={`${styles.badge} ${tone}`}>{label}</span>;
}
