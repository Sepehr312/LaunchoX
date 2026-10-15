"use client";
import { useActionState, useState, useEffect, useRef } from "react";
import { accountAction } from "@/actions/account.actions";
import { profileSchema, changePasswordSchema } from "@/validations/account";
import { addressSchema } from "@/validations/address";
import { FieldErrorsContext } from "@/components/customer/CustomerField";
import { PasswordGuidance } from "@/components/customer/PasswordGuidance";
import { Button } from "@/components/ui/Button";
import styles from "@/components/customer/customer.module.css";
export function AccountForm({
  operation,
  id,
  children,
  label = "ذخیرهٔ تغییرات",
  confirm = false,
  onSuccess,
}: {
  operation: string;
  id?: string;
  children?: React.ReactNode;
  label?: string;
  confirm?: boolean;
  onSuccess?: () => void;
}) {
  const [state, action, pending] = useActionState(accountAction, undefined);
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>(
    {},
  );
  const [passwords, setPasswords] = useState({
    password: "",
    confirmation: "",
  });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && (operation === "password" || operation === "add"))
      formRef.current?.reset();
    if (state?.ok) onSuccess?.();
  }, [state, operation, onSuccess]);
  const errors = Object.keys(clientErrors).length
    ? clientErrors
    : state && !state.ok
      ? (state.fieldErrors ?? {})
      : {};
  return (
    <FieldErrorsContext.Provider value={errors}>
      <form
        ref={formRef}
        action={action}
        noValidate
        aria-busy={pending}
        className="grid min-w-0 gap-4"
        onInput={(event) => {
          if (operation !== "password") return;
          const target = event.target;
          if (
            target instanceof HTMLInputElement &&
            (target.name === "password" || target.name === "confirmPassword")
          )
            setPasswords((current) => ({
              ...current,
              [target.name === "password" ? "password" : "confirmation"]:
                target.value,
            }));
        }}
        onReset={() => setPasswords({ password: "", confirmation: "" })}
        onSubmit={(event) => {
          if (
            confirm &&
            !window.confirm(
              operation === "delete"
                ? "آیا از حذف این آدرس مطمئن هستید؟"
                : "آیا از لغو سفارش مطمئن هستید؟",
            )
          ) {
            event.preventDefault();
            return;
          }
          const schema =
            operation === "profile"
              ? profileSchema
              : operation === "password"
                ? changePasswordSchema
                : operation === "add" || operation === "edit"
                  ? addressSchema
                  : null;
          if (schema) {
            const parsed = schema.safeParse(
              Object.fromEntries(new FormData(event.currentTarget)),
            );
            if (!parsed.success) {
              event.preventDefault();
              const fields: Record<string, string[]> = {};
              for (const issue of parsed.error.issues) {
                (fields[String(issue.path[0])] ??= []).push(issue.message);
              }
              setClientErrors(fields);
              event.currentTarget
                .querySelector<HTMLInputElement>(
                  `[name="${String(parsed.error.issues[0]?.path[0])}"]`,
                )
                ?.focus();
              return;
            }
          }
          setClientErrors({});
        }}
      >
        <input type="hidden" name="operation" value={operation} />
        {id && <input type="hidden" name="id" value={id} />}
        <fieldset disabled={pending} className="grid min-w-0 gap-4">
          <legend className="sr-only">{label}</legend>
          {children}
        </fieldset>
        {operation === "password" && (
          <PasswordGuidance
            password={passwords.password}
            confirmation={passwords.confirmation}
          />
        )}
        <Button
          type="submit"
          disabled={pending}
          variant={
            operation === "delete" ||
            operation === "cancel" ||
            operation === "default"
              ? "secondary"
              : "primary"
          }
          className={
            operation === "delete" || operation === "cancel"
              ? "text-danger"
              : undefined
          }
        >
          {pending ? "در حال ذخیره…" : label}
        </Button>
        {state && !Object.keys(clientErrors).length && (
          <p
            role={state.ok ? "status" : "alert"}
            className={`${styles.notice} ${state.ok ? styles.success : styles.error}`}
          >
            {state.ok ? "تغییرات با موفقیت ذخیره شد." : state.error}
          </p>
        )}
      </form>
    </FieldErrorsContext.Provider>
  );
}
