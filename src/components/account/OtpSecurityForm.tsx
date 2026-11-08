"use client";
import { useRef, useState, useTransition } from "react";
import {
  requestOtpAction,
  passwordOtpAction,
  changeMobileOtpAction,
} from "@/actions/otp.actions";
import { OtpCountdown } from "@/components/auth/AuthForm";
import { PasswordInput } from "@/components/customer/PasswordInput";
import { PasswordGuidance } from "@/components/customer/PasswordGuidance";
import { Input } from "@/components/ui/Input";
import { MobileInput } from "@/components/auth/MobileInput";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/errors";
import styles from "@/components/auth/premium-auth.module.css";

type Challenge = {
  mobile: string;
  challengeId: string;
  expiresAt: string;
  resendAt: string;
};
export function OtpSecurityForm({
  mobile,
  operation,
}: {
  mobile: string;
  operation: "set-password" | "change-mobile";
}) {
  const [current, setCurrent] = useState<Challenge>();
  const [next, setNext] = useState<Challenge>();
  const [newMobile, setNewMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const lock = useRef(false);
  function run(work: () => Promise<ActionResult<unknown>>) {
    if (lock.current) return;
    lock.current = true;
    setError("");
    startTransition(async () => {
      try {
        const result = await work();
        if (!result.ok) setError(result.error);
      } catch {
        setError("انجام درخواست ممکن نشد؛ دوباره تلاش کنید");
      } finally {
        lock.current = false;
      }
    });
  }
  function send(target: "current" | "next") {
    run(async () => {
      const result = await requestOtpAction({
        mobile: target === "current" ? mobile : newMobile,
        purpose: operation,
      });
      if (result.ok) {
        if (target === "current") {
          setCurrent(result.data);
          setPassword("");
          setConfirmation("");
        } else setNext(result.data);
      }
      return result;
    });
  }
  const prefix = operation;
  return (
    <div className="mt-6 grid min-w-0 gap-4">
      <p className="text-sm leading-7 text-muted">
        {operation === "set-password"
          ? "برای تعیین اولین رمز از این بخش، شمارهٔ حساب را با یک کد تازه تأیید کنید."
          : "تغییر شماره به کد تازه برای شمارهٔ فعلی و شمارهٔ جدید نیاز دارد. پس از تغییر، دوباره وارد می‌شوید."}
      </p>
      <Button
        type="button"
        variant="secondary"
        disabled={pending || !mobile}
        onClick={() => send("current")}
      >
        دریافت کد شمارهٔ فعلی
      </Button>
      {current && (
        <OtpCountdown
          key={current.challengeId}
          challenge={current}
          onResend={() => send("current")}
          pending={pending}
        />
      )}
      {operation === "change-mobile" && (
        <>
          <label className="grid gap-2 text-sm" htmlFor={`${prefix}-new`}>
            شمارهٔ جدید
            <MobileInput
              id={`${prefix}-new`}
              value={newMobile}
              onValueChange={(value) => {
                setNewMobile(value);
                setNext(undefined);
              }}
              disabled={pending}
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            disabled={pending || !current || !newMobile}
            onClick={() => send("next")}
          >
            دریافت کد شمارهٔ جدید
          </Button>
          {next && (
            <OtpCountdown
              key={next.challengeId}
              challenge={next}
              onResend={() => send("next")}
              pending={pending}
            />
          )}
        </>
      )}
      {current && (
        <form
          key={`${current.challengeId}:${next?.challengeId ?? ""}`}
          className="grid gap-4"
          onReset={() => {
            setPassword("");
            setConfirmation("");
          }}
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            form.reset();
            const ticket = {
              ...current,
              purpose: operation,
              code: data.get("currentCode"),
            };
            run(() =>
              operation === "set-password"
                ? passwordOtpAction(
                    {
                      ...ticket,
                      password: data.get("password"),
                      confirmPassword: data.get("confirmPassword"),
                    },
                    "/account/profile",
                  )
                : changeMobileOtpAction({
                    current: ticket,
                    next: {
                      ...next,
                      purpose: operation,
                      code: data.get("nextCode"),
                    },
                  }),
            );
          }}
        >
          <label
            className="grid gap-2 text-sm"
            htmlFor={`${prefix}-current-code`}
          >
            کد شمارهٔ فعلی
            <Input
              id={`${prefix}-current-code`}
              name="currentCode"
              dir="ltr"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              disabled={pending}
            />
          </label>
          {operation === "set-password" ? (
            <>
              <label
                className="grid gap-2 text-sm"
                htmlFor={`${prefix}-password`}
              >
                رمز عبور جدید
                <PasswordInput
                  id={`${prefix}-password`}
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={pending}
                />
              </label>
              <label
                className="grid gap-2 text-sm"
                htmlFor={`${prefix}-confirm`}
              >
                تکرار رمز عبور جدید
                <PasswordInput
                  id={`${prefix}-confirm`}
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                  disabled={pending}
                />
              </label>
              <PasswordGuidance
                password={password}
                confirmation={confirmation}
                appearance="auth"
              />
            </>
          ) : (
            <label
              className="grid gap-2 text-sm"
              htmlFor={`${prefix}-next-code`}
            >
              کد شمارهٔ جدید
              <Input
                id={`${prefix}-next-code`}
                name="nextCode"
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                disabled={pending || !next}
              />
            </label>
          )}
          <Button
            type="submit"
            disabled={pending || (operation === "change-mobile" && !next)}
          >
            {pending
              ? "در حال انجام…"
              : operation === "set-password"
                ? "تأیید و ذخیره رمز"
                : "تأیید و تغییر شماره"}
          </Button>
        </form>
      )}
      {error && (
        <p className={styles.authError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
