"use client";

import { useActionState } from "react";
import {
  addCartAction,
  updateCartAction,
  removeCartAction,
} from "@/actions/cart.actions";
import { Button } from "@/components/ui/Button";
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
    <form action={formAction} className="my-4 grid min-w-0 gap-3">
      <input type="hidden" name="product" value={product} />
      <div className="flex flex-wrap items-end gap-3">
        {mode !== "remove" && (
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
        <Button
          type="submit"
          variant={mode === "remove" ? "secondary" : "primary"}
          disabled={pending || (mode !== "remove" && !stock)}
        >
          {pending
            ? "در حال ثبت…"
            : mode === "add"
              ? "افزودن به سبد خرید"
              : mode === "update"
                ? "تغییر تعداد"
                : "حذف از سبد"}
        </Button>
      </div>
      {state && !state.ok && (
        <>
          <p
            role="alert"
            className="fixed end-4 bottom-4 z-50 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-4 text-sm shadow-lg"
          >
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
        <p role="status" className="text-sm text-primary">
          {mode === "remove" ? "محصول حذف شد" : "سبد خرید به‌روز شد"}
        </p>
      )}
    </form>
  );
}
