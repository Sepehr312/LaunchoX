import type { OrderStatus } from "@/types/domain";
import styles from "@/components/customer/customer.module.css";
export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === "cancelled")
    return <p className="text-sm text-danger">این سفارش لغو شده است.</p>;
  const stages = [
    { status: "pending", label: "ثبت سفارش" },
    { status: "processing", label: "آماده‌سازی" },
    { status: "shipped", label: "ارسال" },
    { status: "delivered", label: "تحویل" },
  ];
  const current = stages.findIndex((stage) => stage.status === status);
  return (
    <ol aria-label="مراحل سفارش" className={styles.orderProgress}>
      {stages.map((stage, index) => (
        <li
          key={stage.status}
          aria-current={index === current ? "step" : undefined}
          data-complete={index < current}
          className={index <= current ? "text-primary" : "text-muted"}
        >
          <span className={styles.progressDot} aria-hidden="true">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              {index < current ? (
                <path d="m4 10 4 4 8-8" />
              ) : (
                <circle cx="10" cy="10" r="3" />
              )}
            </svg>
          </span>
          <span>{stage.label}</span>
          {index < current && <span className="sr-only">انجام شده</span>}
        </li>
      ))}
    </ol>
  );
}
