"use client";

import { useActionState } from "react";
import {
  addCartAction,
  updateCartAction,
  removeCartAction,
} from "@/actions/cart.actions";
import { Button } from "@/components/ui/Button";
import styles from "@/components/customer/customer.module.css";
import { toPersianDigits } from "@/lib/format";

export function CartForm({
  product,
  stock,
  quantity = 1,
  mode = "add",
}: {
  product: string;
  stock: number;
  quantity?: number;
  mode?: "add" | "update" | "remove";
}) {
  const action =
    mode === "add"
      ? addCartAction
      : mode === "update"
        ? updateCartAction
        : removeCartAction;
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form
      action={formAction}
      aria-busy={pending}
      onSubmit={(event) => {
        if (
          mode === "remove" &&
          !window.confirm("آیا این محصول از سبد خرید حذف شود؟")
        )
          event.preventDefault();
      }}
      className="my-4 grid min-w-0 gap-3"
    >
      <input type="hidden" name="product" value={product} />
      <div className="flex flex-wrap items-end gap-3">
        {mode === "update" && (
          <div className="grid gap-2 text-sm">
            <span>تعداد</span>
            <div className={styles.stepper}>
              <button
                type="submit"
                name="quantity"
                value={quantity - 1}
                disabled={pending || quantity <= 1}
                aria-label="کاهش تعداد"
              >
                −
              </button>
              <output aria-live="polite">{toPersianDigits(quantity)}</output>
              <button
                type="submit"
                name="quantity"
                value={quantity + 1}
                disabled={pending || quantity >= Math.min(stock, 10)}
                aria-label="افزایش تعداد"
              >
                +
              </button>
            </div>
            {pending && (
              <span role="status" className="text-xs text-muted">
                در حال به‌روزرسانی…
              </span>
            )}
          </div>
        )}
        {mode === "add" && (
          <label className="grid gap-2 text-sm">
            تعداد
            <select
              key={quantity}
              name="quantity"
              defaultValue={quantity}
              disabled={!stock || pending}
              className="min-h-11 rounded-xl border border-border bg-surface px-4 text-foreground"
            >
              {Array.from(
                { length: Math.min(stock, 10) },
                (_, index) => index + 1,
              ).map((value) => (
                <option key={value} value={value}>
                  {toPersianDigits(value)}
                </option>
              ))}
            </select>
          </label>
        )}
        {mode !== "update" && (
          <Button
            type="submit"
            variant={mode === "remove" ? "secondary" : "primary"}
            disabled={pending || (mode !== "remove" && !stock)}
          >
            {pending
              ? "در حال ثبت…"
              : mode === "add"
                ? "افزودن به سبد خرید"
                : "حذف از سبد"}
          </Button>
        )}
      </div>
      {state && !state.ok && (
        <>
          <p role="alert" className={`${styles.notice} ${styles.error}`}>
            {state.error}
          </p>
          {Object.entries(state.fieldErrors ?? {}).map(([field, errors]) => (
            <p key={field} className="text-sm text-muted">
              {errors.join("؛ ")}
            </p>
          ))}
        </>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-success">
          {mode === "remove" ? "محصول حذف شد" : "سبد خرید به‌روز شد"}
        </p>
      )}
    </form>
  );
}
