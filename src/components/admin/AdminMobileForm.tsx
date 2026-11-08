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
        <label className="grid gap-2">
          شمارهٔ مدیر
          <MobileInput
            name="mobile"
            defaultValue={mobile ?? ""}
            required
            disabled={pending}
          />
        </label>
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
      <label className="grid gap-2">
        رمز فعلی مدیر
        <PasswordInput
          name="confirmationPassword"
          autoComplete="current-password"
          required
          disabled={pending}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending
          ? "در حال انجام…"
          : challenge
            ? "تأیید شمارهٔ ورود مدیر"
            : "دریافت کد تأیید مدیر"}
      </Button>
    </form>
  );
}
