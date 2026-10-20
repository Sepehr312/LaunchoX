"use client";
import { useActionState, useState } from "react";
import { userActiveAction } from "@/actions/admin/user.actions";
import { OwnerConfirmationDialog } from "@/components/admin/OwnerConfirmationDialog";

export function UserActiveForm({
  id,
  name,
  isActive,
  isSelf,
  canManage,
  requiresConfirmation,
}: {
  id: string;
  name: string;
  isActive: boolean;
  isSelf: boolean;
  canManage: boolean;
  requiresConfirmation: boolean;
}) {
  const [state, action, pending] = useActionState(userActiveAction, undefined);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <div className="admin-inline-status">
      <form
        action={action}
        aria-busy={pending}
        onSubmit={(event) => {
          if (requiresConfirmation) {
            event.preventDefault();
            setSaved(false);
            setOpen(true);
          }
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="isActive" value={String(!isActive)} />
        <button
          type="submit"
          className="admin-status-switch"
          disabled={pending || !canManage || (isSelf && isActive)}
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
      {open && (
        <OwnerConfirmationDialog
          description={`حساب ادمین «${name}» ${isActive ? "غیرفعال" : "فعال"} شود؟ برای ثبت، رمز عبور مالک را وارد کنید.`}
          fields={{ id, isActive: String(!isActive) }}
          action={userActiveAction}
          onCancel={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            setSaved(true);
          }}
        />
      )}
      {!canManage && (
        <p className="admin-row-note">مجوز تغییر وضعیت ادمین را ندارید.</p>
      )}
      {isSelf && (
        <p className="admin-row-note">حساب شما؛ غیرفعال‌سازی مجاز نیست.</p>
      )}
      {state && !state.ok && (
        <p role="alert" className="admin-field-error">
          {state.error}
        </p>
      )}
      {(state?.ok || saved) && (
        <p role="status" className="admin-row-feedback">
          وضعیت کاربر ثبت شد.
        </p>
      )}
    </div>
  );
}
