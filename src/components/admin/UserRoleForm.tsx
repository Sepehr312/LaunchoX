"use client";

import { useState } from "react";
import { userRoleAction } from "@/actions/admin/user.actions";
import { userRoleValueSchema } from "@/validations/admin-user";
import type { UserRole } from "@/types/domain";
import { OwnerConfirmationDialog } from "@/components/admin/OwnerConfirmationDialog";

type UserRoleFormProps = {
  id: string;
  name: string;
  role: UserRole;
  isSelf: boolean;
  canManage: boolean;
};

export function UserRoleForm(props: UserRoleFormProps) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="admin-user-role">
      {/* A confirmed role replaces the draft form while keeping the action feedback. */}
      <UserRoleFields
        key={props.role}
        {...props}
        onSaved={() => setSaved(true)}
      />
      {!props.canManage && (
        <p className="admin-row-note">مجوز تغییر نقش را ندارید.</p>
      )}
      {props.isSelf && (
        <p className="admin-row-note">نقش حساب شما قابل تغییر نیست.</p>
      )}
      {saved && (
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
  canManage,
  onSaved,
}: UserRoleFormProps & { onSaved: () => void }) {
  const [selected, setSelected] = useState(role);
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <select
        name="role"
        aria-label={`نقش کاربر ${name}`}
        value={selected}
        disabled={isSelf || !canManage}
        onChange={(event) => {
          const value = userRoleValueSchema.safeParse(event.target.value);
          if (value.success) setSelected(value.data);
        }}
      >
        <option value="customer">مشتری</option>
        <option value="admin">ادمین</option>
      </select>
      {!isSelf && canManage && (
        <button
          className="admin-role-save"
          type="button"
          onClick={() => setOpen(true)}
          disabled={selected === role}
          aria-label={`ذخیره نقش ${name}`}
        >
          ذخیره
        </button>
      )}
      {open && (
        <OwnerConfirmationDialog
          description={`نقش کاربر «${name}» به «${selected === "admin" ? "ادمین" : "مشتری"}» تغییر کند؟ برای ثبت، رمز عبور مالک را وارد کنید.`}
          fields={{ id, role: selected }}
          action={userRoleAction}
          onCancel={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            onSaved();
          }}
        />
      )}
    </div>
  );
}
