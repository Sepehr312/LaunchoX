"use client";

import { useActionState, useRef } from "react";
import { Package, Truck, CheckCheck, Ban } from "lucide-react";
import { orderStatusAction } from "@/actions/admin/order.actions";
import type { OrderStatus, PaymentStatus } from "@/types/domain";
import { orderLabels } from "@/types/order-labels";
import styles from "@/components/admin/OrderDetail.module.css";

export function OrderStatusForm({
  id,
  status,
  payment,
}: {
  id: string;
  status: OrderStatus;
  payment: PaymentStatus;
}) {
  const [state, action, pending] = useActionState(orderStatusAction, undefined);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const confirmed = useRef(false);
  const next =
    status === "pending" && payment === "paid"
      ? "processing"
      : status === "processing"
        ? "shipped"
        : status === "shipped"
          ? "delivered"
          : undefined;
  const canCancel = status === "pending" || status === "processing";
  const actionLabel =
    next === "processing"
      ? "شروع آماده‌سازی"
      : next === "shipped"
        ? "ثبت ارسال سفارش"
        : "تأیید تحویل سفارش";
  const Icon =
    next === "shipped" ? Truck : next === "delivered" ? CheckCheck : Package;
  const description =
    status === "pending"
      ? payment === "paid"
        ? "پرداخت انجام شده است؛ آماده‌سازی سفارش را آغاز کنید."
        : "سفارش در انتظار پرداخت مشتری است."
      : status === "processing"
        ? "پس از تحویل بسته به حمل‌کننده، ارسال را ثبت کنید."
        : status === "shipped"
          ? "پس از دریافت سفارش توسط مشتری، تحویل را تأیید کنید."
          : "این سفارش تغییر وضعیت دیگری ندارد.";
  return (
    <section
      className={`admin-panel ${styles.action}`}
      aria-labelledby="order-action-heading"
    >
      <h2 id="order-action-heading">
        <Package size={22} aria-hidden="true" />
        اقدام بعدی
      </h2>
      <span className="admin-badge">{orderLabels[status]}</span>
      <p className={styles.hint}>{description}</p>
      {(next || canCancel) && (
        <form
          action={action}
          aria-busy={pending}
          className={styles.actionForm}
          onSubmit={(event) => {
            const submitter = (event.nativeEvent as SubmitEvent).submitter;
            if (
              submitter instanceof HTMLButtonElement &&
              submitter.value === "cancelled" &&
              !confirmed.current
            ) {
              event.preventDefault();
              dialog.current?.showModal();
              return;
            }
            confirmed.current = false;
          }}
        >
          <input type="hidden" name="id" value={id} />
          {next && (
            <button
              className="admin-primary"
              type="submit"
              name="status"
              value={next}
              disabled={pending}
            >
              <Icon size={18} aria-hidden="true" />
              {pending ? "در حال ثبت…" : actionLabel}
            </button>
          )}
          {canCancel && (
            <button
              ref={cancelButton}
              className={styles.cancelButton}
              type="submit"
              name="status"
              value="cancelled"
              disabled={pending}
            >
              <Ban size={16} aria-hidden="true" />
              لغو سفارش
            </button>
          )}
        </form>
      )}
      {state &&
        (state.ok ? (
          <p role="status" className="admin-success">
            وضعیت سفارش ثبت شد.
          </p>
        ) : (
          <p role="alert" className="admin-error">
            {state.error}
          </p>
        ))}
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="cancel-order-title"
        aria-describedby="cancel-order-description"
      >
        <h2 id="cancel-order-title">لغو سفارش</h2>
        <p id="cancel-order-description">
          این سفارش لغو شود؟ موجودی کالاها به انبار برمی‌گردد.
          {payment === "paid" &&
            " مبلغ پرداخت‌شده به‌صورت خودکار بازپرداخت نمی‌شود."}
        </p>
        <div className={styles.dialogActions}>
          <button
            type="button"
            autoFocus
            onClick={() => dialog.current?.close()}
          >
            بازگشت
          </button>
          <button
            type="button"
            className={styles.confirmCancel}
            onClick={() => {
              dialog.current?.close();
              confirmed.current = true;
              cancelButton.current?.form?.requestSubmit(cancelButton.current);
            }}
          >
            بله، لغو سفارش
          </button>
        </div>
      </dialog>
    </section>
  );
}
