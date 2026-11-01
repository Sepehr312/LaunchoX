"use client";

import { useActionState } from "react";
import { productAction } from "@/actions/admin/product.actions";

export function ProductActiveForm({
  id,
  title,
  isActive,
}: {
  id: string;
  title: string;
  isActive: boolean;
}) {
  const [state, action, pending] = useActionState(productAction, undefined);
  return (
    <form action={action} className="admin-product-status">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="operation" value="active" />
      <input type="hidden" name="isActive" value={String(!isActive)} />
      <button
        type="submit"
        role="switch"
        aria-checked={isActive}
        aria-label={`وضعیت محصول «${title}»`}
        disabled={pending}
        className="admin-status-switch"
      >
        <span>{isActive ? "فعال" : "غیرفعال"}</span>
        <span className="admin-switch-track" aria-hidden="true">
          <span />
        </span>
      </button>
      {state && !state.ok && (
        <p role="alert" className="admin-field-error">
          {state.error}
        </p>
      )}
    </form>
  );
}
