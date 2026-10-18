"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { productAction } from "@/actions/admin/product.actions";
export function ProductRowActions({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [state, action, pending] = useActionState(productAction, undefined);
  return (
    <div className="admin-product-row-actions">
      <Link href={`/admin/products/${id}/edit`}>
        <Pencil size={18} aria-hidden="true" />
        ویرایش
      </Link>
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
        <button
          type="submit"
          disabled={pending}
          className="admin-delete-product"
          aria-label={`حذف محصول «${title}»`}
          title="حذف محصول"
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </form>
      {state && !state.ok && <p role="alert">{state.error}</p>}
    </div>
  );
}
