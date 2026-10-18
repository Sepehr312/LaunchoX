"use client";

import { useActionState, useState } from "react";
import { userRoleAction } from "@/actions/admin/user.actions";
import { userRoleValueSchema } from "@/validations/admin-user";
import type { UserRole } from "@/types/domain";

type UserRoleFormProps = {
  id: string;
  name: string;
  role: UserRole;
  isSelf: boolean;
};

export function UserRoleForm(props: UserRoleFormProps) {
  const [state, action, pending] = useActionState(userRoleAction, undefined);
  return (
    <div className="admin-user-role">
      {/* A confirmed role replaces the draft form while keeping the action feedback. */}
      <UserRoleFields
        key={props.role}
        {...props}
        action={action}
        pending={pending}
      />
      {props.isSelf && (
        <p className="admin-row-note">نقش حساب شما قابل تغییر نیست.</p>
      )}
      {state && !state.ok && (
        <p role="alert" className="admin-field-error">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="admin-row-feedback">
          نقش کاربر ثبت شد.
        </p>
      )}
    </div>
  );
}

function UserRoleFields({
  id,
  name,
  role,
  isSelf,
  action,
  pending,
}: UserRoleFormProps & { action: (form: FormData) => void; pending: boolean }) {
  const [selected, setSelected] = useState(role);
  return (
    <form
      action={action}
      aria-busy={pending}
      onSubmit={(event) => {
        const label = selected === "admin" ? "ادمین" : "مشتری";
        if (!window.confirm(`نقش کاربر «${name}» به «${label}» تغییر کند؟`))
          event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <select
        name="role"
        aria-label={`نقش کاربر ${name}`}
        value={selected}
        disabled={pending || isSelf}
        onChange={(event) => {
          const value = userRoleValueSchema.safeParse(event.target.value);
          if (value.success) setSelected(value.data);
        }}
      >
        <option value="customer">مشتری</option>
        <option value="admin">ادمین</option>
      </select>
      {!isSelf && (
        <button
          type="submit"
          disabled={pending || selected === role}
          aria-label={`ذخیره نقش ${name}`}
        >
          {pending ? "در حال ذخیره…" : "ذخیره"}
        </button>
      )}
    </form>
  );
}
