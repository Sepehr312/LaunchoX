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
    <div className="admin-inline-status">
      <form action={action} aria-busy={pending}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="isActive" value={String(!isActive)} />
        <button
          type="submit"
          className="admin-status-switch"
          disabled={pending || (isSelf && isActive)}
          role="switch"
          aria-checked={isActive}
          aria-label={`${isActive ? "غیرفعال کردن" : "فعال کردن"} حساب ${name}`}
        >
          <span>{isActive ? "فعال" : "غیرفعال"}</span>
          <span className="admin-switch-track" aria-hidden="true">
            <span />
          </span>
        </button>
      </form>
      {isSelf && (
        <p className="admin-row-note">حساب شما؛ غیرفعال‌سازی مجاز نیست.</p>
      )}
      {state && !state.ok && (
        <p role="alert" className="admin-field-error">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="admin-row-feedback">
          وضعیت کاربر ثبت شد.
        </p>
      )}
    </div>
  );
}
