"use client";
import { useActionState } from "react";
import { orderStatusAction } from "@/actions/admin/order.actions";
import type { OrderStatus, PaymentStatus } from "@/types/domain";
import { orderLabels } from "@/types/order-labels";

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
  const options: OrderStatus[] =
    status === "pending"
      ? payment === "paid"
        ? ["processing", "cancelled"]
        : ["cancelled"]
      : status === "processing"
        ? ["shipped", "cancelled"]
        : status === "shipped"
          ? ["delivered"]
          : [];
  return (
    <section className="admin-panel grid gap-4">
      <h2>تغییر وضعیت سفارش</h2>
      {options.length ? (
        <form action={action} className="grid gap-3" key={status}>
          <input type="hidden" name="id" value={id} />
          <label>
            وضعیت بعدی
            <select name="status" className="field-input" disabled={pending}>
              {options.map((option) => (
                <option key={option} value={option}>
                  {orderLabels[option]}
                </option>
              ))}
            </select>
          </label>
          <button disabled={pending}>
            {pending ? "در حال ثبت…" : "ثبت وضعیت"}
          </button>
        </form>
      ) : (
        <p>این سفارش تغییر وضعیت دیگری ندارد.</p>
      )}
      {state &&
        (state.ok ? (
          <p role="status">وضعیت سفارش ثبت شد.</p>
        ) : (
          <p role="alert">{state.error}</p>
        ))}
    </section>
  );
}
