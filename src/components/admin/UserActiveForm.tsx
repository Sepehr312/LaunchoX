"use client";
import { useActionState } from "react";
import { userActiveAction } from "@/actions/admin/user.actions";

export function UserActiveForm({
  id,
  name,
  isActive,
  isSelf,
}: {
  id: string;
  name: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const [state, action, pending] = useActionState(userActiveAction, undefined);
  return (
    <div className="grid gap-2">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="isActive" value={String(!isActive)} />
        <button
          disabled={pending || (isSelf && isActive)}
          aria-label={`${isActive ? "غیرفعال کردن" : "فعال کردن"} حساب ${name}`}
        >
          {pending ? "در حال ذخیره…" : isActive ? "غیرفعال کردن" : "فعال کردن"}
        </button>
      </form>
      {isSelf && <p className="text-sm">حساب شما؛ غیرفعال‌سازی مجاز نیست.</p>}
      {state && !state.ok && <p role="alert">{state.error}</p>}
      {state?.ok && <p role="status">وضعیت کاربر ثبت شد.</p>}
    </div>
  );
}
