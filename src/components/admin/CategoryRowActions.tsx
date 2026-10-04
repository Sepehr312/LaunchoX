"use client";
import Link from "next/link";
import { useActionState } from "react";
import { categoryAction } from "@/actions/admin/category.actions";
export function CategoryRowActions({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(categoryAction, undefined);
  return (
    <div className="grid gap-2">
      <Link href={`/admin/categories/${id}/edit`}>ویرایش</Link>
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
        <button disabled={pending} className="text-danger">
          حذف دسته‌بندی
        </button>
      </form>
      {state && !state.ok && <p role="alert">{state.error}</p>}
    </div>
  );
}
