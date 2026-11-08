"use client";
import { useActionState, useState } from "react";
import { initialPasswordAction } from "@/actions/otp.actions";
import { PasswordInput } from "@/components/customer/PasswordInput";
import { PasswordGuidance } from "@/components/customer/PasswordGuidance";
import { Button } from "@/components/ui/Button";
import styles from "@/components/auth/premium-auth.module.css";

export function InitialPasswordForm({ callbackUrl }: { callbackUrl: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [state, action, pending] = useActionState(
    initialPasswordAction,
    undefined,
  );
  return (
    <section className={`${styles.card} ${styles.mobileAuth}`}>
      <h1>حساب شما آماده است</h1>
      <p>
        برای ورودهای بعدی می‌توانید رمز دلخواه تعیین کنید؛ این مرحله اختیاری
        است.
      </p>
      <form action={action} className={styles.authFields}>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <label className={styles.authLabel} htmlFor="initial-password">
          رمز عبور
          <PasswordInput
            id="initial-password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={pending}
          />
        </label>
        <label className={styles.authLabel} htmlFor="initial-confirm">
          تکرار رمز عبور
          <PasswordInput
            id="initial-confirm"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={pending}
          />
        </label>
        <PasswordGuidance
          password={password}
          confirmation={confirmation}
          appearance="auth"
        />
        {state && !state.ok && (
          <p role="alert" className={styles.authError}>
            {state.error}
          </p>
        )}
        <Button
          name="operation"
          value="save"
          type="submit"
          disabled={pending}
          className={styles.submit}
        >
          {pending ? "در حال انجام…" : "ذخیره رمز و ادامه"}
        </Button>
        <Button
          name="operation"
          value="skip"
          type="submit"
          variant="secondary"
          disabled={pending}
        >
          فعلاً رد می‌کنم
        </Button>
      </form>
    </section>
  );
}
