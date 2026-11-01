"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { brandAction } from "@/actions/admin/brand.actions";
export function BrandRowActions({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(brandAction, undefined);
  return (
    <div className="admin-list-row-actions">
      <Link
        href={`/admin/brands/${id}/edit`}
        aria-label={`ویرایش برند ${name}`}
      >
        <Pencil size={18} aria-hidden="true" />
        ویرایش
      </Link>
      <form
        action={action}
        aria-busy={pending}
        onSubmit={(event) => {
          if (
            !window.confirm(
              `برند «${name}» حذف شود؟ این کار قابل بازگشت نیست. برند دارای محصول قابل حذف نیست.`,
            )
          )
            event.preventDefault();
        }}
      >
        <input type="hidden" name="operation" value="delete" />
        <input type="hidden" name="id" value={id} />
        <button
          className="admin-row-delete"
          disabled={pending}
          aria-label={`حذف برند ${name}`}
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </form>
      {state && !state.ok && (
        <p role="alert" className="admin-field-error">
          {state.error}
        </p>
      )}
    </div>
  );
}
