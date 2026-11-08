"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { ArrowLeft, LoaderCircle, Smartphone } from "lucide-react";
import { loginAction } from "@/actions/auth.actions";
import {
  requestOtpAction,
  verifyLoginOtpAction,
  passwordOtpAction,
} from "@/actions/otp.actions";
import { PasswordInput } from "@/components/customer/PasswordInput";
import { OtpCodeInput } from "@/components/auth/OtpCodeInput";
import { MobileInput } from "@/components/auth/MobileInput";
import { Button } from "@/components/ui/Button";
import { toPersianDigits } from "@/lib/format";
import type { ActionResult } from "@/lib/errors";
import styles from "@/components/auth/premium-auth.module.css";

type Challenge = {
  challengeId: string;
  mobile: string;
  expiresAt: string;
  resendAt: string;
};
const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
export function OtpCountdown({
  challenge,
  onResend,
  pending,
}: {
  challenge: Challenge;
  onResend: () => void;
  pending: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(challenge.resendAt) - now) / 1000),
  );
  const remaining = Math.max(
    0,
    Math.ceil((Date.parse(challenge.expiresAt) - now) / 1000),
  );
  return (
    <div className={styles.otpTiming}>
      <p>
        {remaining
          ? `اعتبار کد: ${toPersianDigits(Math.floor(remaining / 60))}:${toPersianDigits(String(remaining % 60).padStart(2, "0"))}`
          : "اعتبار کد تمام شد؛ کد تازه درخواست کنید."}
      </p>
      <button
        type="button"
        disabled={pending || seconds > 0}
        onClick={onResend}
      >
        {seconds
          ? `ارسال مجدد تا ${toPersianDigits(String(Math.floor(seconds / 60)).padStart(2, "0"))}:${toPersianDigits(String(seconds % 60).padStart(2, "0"))}`
          : "ارسال مجدد کد"}
      </button>
    </div>
  );
}

export function AuthForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl: string;
  initialError?: string;
}) {
  // Native submission before hydration would expose credentials in the URL.
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    clientReady,
    serverReady,
  );
  const [mode, setMode] = useState<"otp" | "password" | "recovery">("otp");
  const [mobile, setMobile] = useState("");
  const [challenge, setChallenge] = useState<Challenge>();
  const [error, setError] = useState(initialError ?? "");
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  function run(work: () => Promise<ActionResult<unknown>>) {
    if (submitting.current) return;
    submitting.current = true;
    setError("");
    startTransition(async () => {
      try {
        const result = await work();
        if (!result.ok) setError(result.error);
      } catch {
        setError("ارتباط برقرار نشد؛ دوباره تلاش کنید");
      } finally {
        submitting.current = false;
      }
    });
  }
  function switchMode(next: typeof mode) {
    setMode(next);
    setChallenge(undefined);
    setError("");
  }
  function send() {
    run(async () => {
      const result = await requestOtpAction({
        mobile,
        purpose: mode === "recovery" ? "recovery" : "login",
      });
      if (result.ok) {
        setChallenge(result.data);
        setMobile(result.data.mobile);
      }
      return result;
    });
  }
  return (
    <section
      className={`${styles.card} ${styles.mobileAuth}`}
      aria-labelledby="login-title"
    >
      <h1 id="login-title">
        {mode === "recovery" ? "بازیابی رمز عبور" : "ورود | ثبت‌نام"}
      </h1>
      <p>
        {challenge ? (
          <>
            کد تأیید شمارهٔ <bdi>{toPersianDigits(challenge.mobile)}</bdi> را
            وارد کنید.
          </>
        ) : (
          "با شماره موبایل خود وارد شوید یا ثبت‌نام کنید."
        )}
      </p>
      {mode !== "recovery" && (
        <div className={styles.authTabs} role="group" aria-label="روش ورود">
          <button
            type="button"
            aria-pressed={mode === "otp"}
            disabled={pending}
            onClick={() => switchMode("otp")}
          >
            کد پیامکی
          </button>
          <button
            type="button"
            aria-pressed={mode === "password"}
            disabled={pending}
            onClick={() => switchMode("password")}
          >
            رمز عبور
          </button>
        </div>
      )}
      <form
        method="post"
        key={`${mode}:${challenge?.challengeId ?? "number"}`}
        className={styles.authFields}
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          if (mode === "password") {
            data.set("mobile", mobile);
            data.set("callbackUrl", callbackUrl);
            form.reset();
            run(() => loginAction({ ok: true, data: undefined }, data));
          } else if (!challenge) send();
          else {
            const input = {
              mobile: challenge.mobile,
              challengeId: challenge.challengeId,
              code: data.get("code"),
              purpose: mode === "recovery" ? "recovery" : "login",
              password: data.get("password"),
              confirmPassword: data.get("confirmPassword"),
            };
            form.reset();
            run(() =>
              mode === "recovery"
                ? passwordOtpAction(input, callbackUrl)
                : verifyLoginOtpAction(input, callbackUrl),
            );
          }
        }}
      >
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        {!challenge ? (
          <label className={styles.authLabel} htmlFor="login-mobile">
            شماره موبایل
            <span className={styles.field} dir="ltr">
              <Smartphone
                className={styles.fieldIcon}
                size={19}
                aria-hidden="true"
              />
              <MobileInput
                id="login-mobile"
                name="mobile"
                value={mobile}
                onValueChange={setMobile}
                placeholder="شماره موبایل خود را وارد کنید"
                required
                disabled={pending}
              />
            </span>
          </label>
        ) : (
          <>
            <label className={styles.authLabel} htmlFor="login-code">
              کد تأیید
              <OtpCodeInput
                id="login-code"
                name="code"
                disabled={pending}
                describedBy="otp-request-status"
              />
            </label>
            <p
              id="otp-request-status"
              role="status"
              className={styles.authHint}
            >
              درخواست ارسال کد پذیرفته شد؛ دریافت پیامک ممکن است کمی زمان ببرد.
            </p>
            <button
              type="button"
              className={styles.textButton}
              disabled={pending}
              onClick={() => setChallenge(undefined)}
            >
              ویرایش شماره
            </button>
            <OtpCountdown
              key={challenge.challengeId}
              challenge={challenge}
              onResend={send}
              pending={pending}
            />
          </>
        )}
        {(mode === "password" || (mode === "recovery" && challenge)) && (
          <label className={styles.authLabel} htmlFor="login-password">
            {mode === "recovery" ? "رمز عبور جدید" : "رمز عبور"}
            <PasswordInput
              id="login-password"
              name="password"
              required
              disabled={pending}
              autoComplete={
                mode === "password" ? "current-password" : "new-password"
              }
              aria-label="رمز عبور"
            />
          </label>
        )}
        {mode === "recovery" && challenge && (
          <label className={styles.authLabel} htmlFor="login-confirm-password">
            تکرار رمز عبور جدید
            <PasswordInput
              id="login-confirm-password"
              name="confirmPassword"
              required
              disabled={pending}
              autoComplete="new-password"
              aria-label="تکرار رمز عبور جدید"
            />
          </label>
        )}
        {mode === "password" && (
          <button
            type="button"
            className={styles.textButton}
            onClick={() => switchMode("recovery")}
            disabled={pending}
          >
            رمز عبور را فراموش کرده‌ام
          </button>
        )}
        {error && (
          <p className={styles.authError} role="alert">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={!hydrated || pending}
          className={styles.submit}
        >
          {!hydrated ? (
            "در حال آماده‌سازی…"
          ) : pending ? (
            <>
              <LoaderCircle
                size={19}
                className="motion-safe:animate-spin"
                aria-hidden="true"
              />{" "}
              در حال انجام…
            </>
          ) : mode === "password" ? (
            "ورود"
          ) : challenge ? (
            mode === "recovery" ? (
              "ذخیره رمز جدید"
            ) : (
              "تأیید و ادامه"
            )
          ) : (
            <>
              دریافت کد تأیید{" "}
              <ArrowLeft
                className={styles.submitArrow}
                size={20}
                aria-hidden="true"
              />
            </>
          )}
        </Button>
        <noscript>
          <p className={styles.authError}>
            برای ورود، جاوااسکریپت مرورگر را فعال کنید.
          </p>
        </noscript>
      </form>
      {mode !== "recovery" && (
        <p className={styles.authHint}>
          {mode === "otp"
            ? "حساب جدید پس از تأیید شماره ساخته می‌شود."
            : "اگر رمز تعیین نکرده‌اید، با کد پیامکی وارد شوید."}
        </p>
      )}
      {mode === "recovery" && (
        <button
          type="button"
          className={styles.textButton}
          disabled={pending}
          onClick={() => switchMode("password")}
        >
          بازگشت به ورود با رمز
        </button>
      )}
    </section>
  );
}
