"use client";
import { useActionState } from "react";
import { accountAction } from "@/actions/account.actions";
import { Button } from "@/components/ui/Button";
export function AccountForm({
  operation,
  id,
  children,
  label = "ذخیرهٔ تغییرات",
  confirm = false,
}: {
  operation: string;
  id?: string;
  children?: React.ReactNode;
  label?: string;
  confirm?: boolean;
}) {
  const [state, action, pending] = useActionState(accountAction, undefined);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (confirm && !window.confirm("آیا از انجام این کار مطمئن هستید؟"))
          event.preventDefault();
      }}
      className="grid min-w-0 gap-4"
    >
      <input type="hidden" name="operation" value={operation} />
      {id && <input type="hidden" name="id" value={id} />}
      {children}
      <Button type="submit" disabled={pending}>
        {pending ? "در حال ذخیره…" : label}
      </Button>
      {state && (
        <p role="status" className={state.ok ? "text-primary" : "text-danger"}>
          {state.ok ? "تغییرات ذخیره شد" : state.error}
        </p>
      )}
    </form>
  );
}
