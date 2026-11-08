"use client";
import { useRef, useState, useTransition } from "react";
import {
  requestAdminMobileAction,
  finishAdminMobileAction,
} from "@/actions/admin/mobile.actions";
import { OtpCountdown } from "@/components/auth/AuthForm";
import { Input } from "@/components/ui/Input";
import { MobileInput } from "@/components/auth/MobileInput";
import { PasswordInput } from "@/components/customer/PasswordInput";
import { Button } from "@/components/ui/Button";
import { MessageSquare, Smartphone } from "lucide-react";
import { toPersianDigits } from "@/lib/format";
import styles from "@/components/admin/AdminSecurity.module.css";
export function AdminMobileForm({ mobile }: { mobile?: string }) {
  const [challenge, setChallenge] = useState<{
    mobile: string;
    challengeId: string;
    expiresAt: string;
    resendAt: string;
  }>();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const lock = useRef(false);
  return (
    <form
      className="grid max-w-lg gap-5"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        if (lock.current) return;
        lock.current = true;
        const form = event.currentTarget;
        const data = new FormData(form);
        form.reset();
        setError("");
        startTransition(async () => {
          try {
            const result = challenge
              ? await finishAdminMobileAction({
                  ...challenge,
                  purpose: "admin-enrollment",
                  code: data.get("code"),
                  confirmationPassword: data.get("confirmationPassword"),
                })
              : await requestAdminMobileAction(Object.fromEntries(data));
            if (!result.ok) setError(result.error);
            else if (result.data) setChallenge(result.data);
          } catch {
            setError("ارتباط برقرار نشد؛ دوباره تلاش کنید");
          } finally {
            lock.current = false;
          }
        });
      }}
    >
      {!challenge ? (
        <div className="grid min-w-0 gap-2">
          <label htmlFor="admin-mobile">شمارهٔ مدیر</label>
          <div className={styles.mobileInput}>
            <Smartphone size={20} aria-hidden="true" />
            <MobileInput
              id="admin-mobile"
              name="mobile"
              defaultValue={toPersianDigits(mobile ?? "")}
              required
              disabled={pending}
            />
          </div>
        </div>
      ) : (
        <>
          <label className="grid gap-2">
            کد تأیید
            <Input
              name="code"
              inputMode="numeric"
              dir="ltr"
              autoComplete="one-time-code"
              maxLength={6}
              required
              disabled={pending}
            />
          </label>
          <OtpCountdown
            challenge={challenge}
            onResend={() => setChallenge(undefined)}
            pending={pending}
          />
          <button
            type="button"
            onClick={() => setChallenge(undefined)}
            disabled={pending}
          >
            ویرایش شماره و درخواست تازه
          </button>
        </>
      )}
      <div className="grid min-w-0 gap-2">
        <label htmlFor="admin-confirmation-password">رمز فعلی مدیر</label>
        <PasswordInput
          id="admin-confirmation-password"
          aria-label="رمز فعلی مدیر"
          name="confirmationPassword"
          autoComplete="current-password"
          required
          disabled={pending}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        <MessageSquare size={20} aria-hidden="true" />
        {pending
          ? "در حال انجام…"
          : challenge
            ? "تأیید شمارهٔ ورود مدیر"
            : "دریافت کد تأیید مدیر"}
      </Button>
    </form>
  );
}
