"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { PasswordInput } from "@/components/customer/PasswordInput";
import type { ActionResult } from "@/lib/errors";
import styles from "@/components/admin/OwnerConfirmationDialog.module.css";

type Props = {
  description: string;
  fields: Record<string, string>;
  action: (
    state: ActionResult<{ id: string }> | undefined,
    form: FormData,
  ) => Promise<ActionResult<{ id: string }>>;
  onCancel: () => void;
  onSuccess: () => void;
};

export function OwnerConfirmationDialog({
  description,
  fields,
  action,
  onCancel,
  onSuccess,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [state, submit, pending] = useActionState(
    async (
      previous: ActionResult<{ id: string }> | undefined,
      data: FormData,
    ) => {
      form.current?.reset();
      const result = await action(previous, data);
      if (result.ok) onSuccess();
      return result;
    },
    undefined,
  );

  useEffect(() => {
    const node = dialog.current;
    const trigger = document.activeElement;
    node?.showModal();
    node
      ?.querySelector<HTMLInputElement>('input[name="confirmationPassword"]')
      ?.focus();
    return () => {
      node?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus();
    };
  }, []);

  useEffect(() => {
    if (state && !state.ok && !pending)
      form.current
        ?.querySelector<HTMLInputElement>('input[name="confirmationPassword"]')
        ?.focus();
  }, [state, pending]);

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
    >
      <h2 id={titleId}>تأیید تغییرات توسط مالک</h2>
      <p id={descriptionId}>{description}</p>
      <form
        ref={form}
        action={submit}
        className={styles.form}
        aria-busy={pending}
      >
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <div className={styles.password}>
          <label htmlFor={`${titleId}-password`}>رمز عبور مالک</label>
          <PasswordInput
            id={`${titleId}-password`}
            name="confirmationPassword"
            aria-label="رمز عبور مالک"
            autoComplete="current-password"
            required
            maxLength={72}
            disabled={pending}
          />
        </div>
        {state && !state.ok && (
          <p role="alert" className={styles.error}>
            {state.error}
          </p>
        )}
        <div className={styles.buttons}>
          <button type="submit" disabled={pending}>
            {pending ? "در حال تأیید…" : "تأیید و ثبت تغییرات"}
          </button>
          <button
            type="button"
            className={styles.cancel}
            disabled={pending}
            onClick={onCancel}
          >
            انصراف
          </button>
        </div>
      </form>
    </dialog>
  );
}
