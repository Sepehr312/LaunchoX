"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { categoryAction } from "@/actions/admin/category.actions";
export function CategoryRowActions({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(categoryAction, undefined);
  return (
    <div className="admin-list-row-actions">
      <Link href={`/admin/categories/${id}/edit`}>
        <Pencil size={18} aria-hidden="true" />
        ویرایش
      </Link>
      <form
        action={action}
        onSubmit={(event) => {
          if (
            !window.confirm(
              `دسته‌بندی «${name}» حذف شود؟ این کار قابل بازگشت نیست.`,
            )
          )
            event.preventDefault();
        }}
      >
        <input type="hidden" name="operation" value="delete" />
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={pending}
          className="admin-row-delete"
          aria-label="حذف دسته‌بندی"
          title={`حذف دسته‌بندی ${name}`}
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </form>
      {state && !state.ok && <p role="alert">{state.error}</p>}
    </div>
  );
}
