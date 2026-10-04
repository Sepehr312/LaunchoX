"use client";
import Link from "next/link";
import { useActionState } from "react";
import { productAction } from "@/actions/admin/product.actions";
export function ProductRowActions({
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
    <div className="grid gap-2">
      <Link href={`/admin/products/${id}/edit`}>ویرایش</Link>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="operation" value="active" />
        <input type="hidden" name="isActive" value={String(!isActive)} />
        <button disabled={pending}>
          {isActive ? "غیرفعال کردن" : "فعال کردن"}
        </button>
      </form>
      <form
        action={action}
        onSubmit={(event) => {
          if (
            !window.confirm(
              `محصول «${title}» حذف شود؟ این کار قابل بازگشت نیست.`,
            )
          )
            event.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="operation" value="delete" />
        <button disabled={pending} className="text-danger">
          حذف محصول
        </button>
      </form>
      {state && !state.ok && <p role="alert">{state.error}</p>}
    </div>
  );
}
