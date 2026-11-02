"use client";
import { useActionState } from "react";
import { userLogoutAction } from "@/actions/admin/user.actions";

export function UserLogoutForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(userLogoutAction, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="admin-button admin-button-secondary"
        disabled={pending}
      >
        {pending ? "در حال خروج…" : "خروج از همهٔ دستگاه‌ها"}
      </button>
      {state && (
        <p role={state.ok ? "status" : "alert"}>
          {state.ok
            ? "نشست‌های مشتری باطل شد؛ برای ادامه باید دوباره وارد شود."
            : state.error}
        </p>
      )}
    </form>
  );
}
