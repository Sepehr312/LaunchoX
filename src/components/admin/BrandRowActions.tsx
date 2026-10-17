"use client";
import Link from "next/link";
import { useActionState } from "react";
import { brandAction } from "@/actions/admin/brand.actions";
export function BrandRowActions({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(brandAction, undefined);
  return (
    <div>
      <div className="admin-actions">
        <Link
          href={`/admin/brands/${id}/edit`}
          aria-label={`ویرایش برند ${name}`}
        >
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
            className="admin-danger"
            disabled={pending}
            aria-label={`حذف برند ${name}`}
          >
            {pending ? "در حال حذف…" : "حذف"}
          </button>
        </form>
      </div>
      {state && !state.ok && (
        <p role="alert" className="admin-field-error">
          {state.error}
        </p>
      )}
    </div>
  );
}
