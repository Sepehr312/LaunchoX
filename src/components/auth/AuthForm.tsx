"use client";
import { useActionState, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { PremiumAuthHeading } from "@/components/auth/PremiumAuthHeading";
import { loginAction, registerAction } from "@/actions/auth.actions";
import { loginSchema, registerSchema } from "@/validations/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordGuidance } from "@/components/customer/PasswordGuidance";
import { PasswordInput } from "@/components/customer/PasswordInput";
import { SnowflakeIcon, ShieldIcon } from "@/components/store/Icons";
import styles from "@/components/customer/customer.module.css";
import premiumStyles from "@/components/auth/premium-auth.module.css";
import type { AuthActionState } from "@/types/auth";

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("launchox:remember-email", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("launchox:remember-email", callback);
  };
}
function readRememberedEmail() {
  try {
    const email = sessionStorage.getItem("launchox-remember-email");
    const parsed = loginSchema.shape.email.safeParse(email);
    return parsed.success ? parsed.data : "";
  } catch {
    return "";
  }
}
function rememberEmail(value: string) {
  try {
    const parsed = loginSchema.shape.email.safeParse(value);
    if (parsed.success)
      sessionStorage.setItem("launchox-remember-email", parsed.data);
    else sessionStorage.removeItem("launchox-remember-email");
    window.dispatchEvent(new Event("launchox:remember-email"));
  } catch {
    // Storage restrictions must not prevent login.
  }
}
export function AuthForm({
  mode,
  callbackUrl,
  initialError,
  appearance = "default",
  linkMode = "production",
}: {
  mode: "login" | "register";
  callbackUrl: string;
  initialError?: string;
  appearance?: "default" | "premium";
  linkMode?: "production" | "preview";
}) {
  const register = mode === "register";
  const premium = appearance === "premium";
  const [values, setValues] = useState<Record<string, string>>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>(
    {},
  );
  const [remember, setRemember] = useState<boolean | null>(null);
  const [state, action, pending] = useActionState(
    register ? registerAction : loginAction,
    { ok: true, data: undefined } as AuthActionState,
  );
  const rememberedEmail = useSyncExternalStore(
    subscribeToStorage,
    readRememberedEmail,
    () => "",
  );
  const effectiveRemember = remember ?? Boolean(rememberedEmail);
  const fields = [
    ...(register
      ? [
          {
            name: "name",
            label: "نام و نام خانوادگی",
            autoComplete: "name",
            type: "text",
          },
        ]
      : []),
    { name: "email", label: "ایمیل", autoComplete: "email", type: "email" },
    {
      name: "password",
      label: "رمز عبور",
      autoComplete: register ? "new-password" : "current-password",
      type: "password",
    },
    ...(register
      ? [
          {
            name: "confirmPassword",
            label: "تکرار رمز عبور",
            autoComplete: "new-password",
            type: "password",
          },
        ]
      : []),
  ];
  return (
    <section className={premium ? premiumStyles.card : styles.authCard}>
      {!premium && (
        <Link href="/" className={styles.brand}>
          <SnowflakeIcon />
          <span>لانچ‌اوکس</span>
        </Link>
      )}
      {premium ? (
        <PremiumAuthHeading register={register} />
      ) : (
        <>
          <h1 className="mt-8 text-2xl font-bold">
            {register ? "حساب خود را بسازید" : "خوش آمدید"}
          </h1>
          <p className="mt-3 mb-8 text-sm leading-7 text-muted">
            {register
              ? "برای مدیریت سفارش‌ها و آدرس‌ها، ثبت‌نام کنید."
              : "برای ورود به فضای شخصی خود، اطلاعات حسابتان را وارد کنید."}
          </p>
        </>
      )}
      <form
        action={action}
        noValidate
        aria-busy={pending}
        className="grid gap-5"
        onSubmit={(event) => {
          if (pending) {
            event.preventDefault();
            return;
          }
          const parsed = (register ? registerSchema : loginSchema).safeParse(
            Object.fromEntries(new FormData(event.currentTarget)),
          );
          if (!parsed.success) {
            event.preventDefault();
            const errors: Record<string, string[]> = {};
            for (const issue of parsed.error.issues) {
              const key = String(issue.path[0]);
              (errors[key] ??= []).push(issue.message);
            }
            setClientErrors(errors);
            event.currentTarget
              .querySelector<HTMLInputElement>(
                `[name="${String(parsed.error.issues[0]?.path[0])}"]`,
              )
              ?.focus();
          } else {
            setClientErrors({});
            if (!register)
              rememberEmail(effectiveRemember ? parsed.data.email : "");
          }
        }}
      >
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        {fields.map((field) => {
          const errors =
            clientErrors[field.name] ??
            (!state.ok ? state.fieldErrors?.[field.name] : undefined);
          const props = {
            id: field.name,
            name: field.name,
            type: field.type,
            autoComplete: field.autoComplete,
            value:
              values[field.name] ??
              (field.name === "email" && !register ? rememberedEmail : ""),
            required: true,
            disabled: pending,
            "aria-invalid": Boolean(errors?.length),
            "aria-describedby":
              [
                errors?.length ? `${field.name}-error` : "",
                field.name === "password" && register && !premium
                  ? "password-hint"
                  : "",
              ]
                .filter(Boolean)
                .join(" ") || undefined,
            onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
              setValues((current) => ({
                ...current,
                [field.name]: event.target.value,
              }));
              if (!register && field.name === "email" && effectiveRemember) {
                setRemember(true);
                rememberEmail(event.target.value);
              }
              setClientErrors((current) => ({ ...current, [field.name]: [] }));
            },
          };
          return (
            <div key={field.name} className="grid gap-2">
              <label htmlFor={field.name}>{field.label}</label>
              <div className={premium ? premiumStyles.field : undefined}>
                {premium &&
                  (field.type === "password" ? (
                    <LockKeyhole
                      className={premiumStyles.fieldIcon}
                      size={19}
                      aria-hidden="true"
                    />
                  ) : field.name === "name" ? (
                    <UserRound
                      className={premiumStyles.fieldIcon}
                      size={19}
                      aria-hidden="true"
                    />
                  ) : (
                    <Mail
                      className={premiumStyles.fieldIcon}
                      size={19}
                      aria-hidden="true"
                    />
                  ))}
                {field.type === "password" ? (
                  <PasswordInput
                    {...props}
                    aria-label={field.label}
                    placeholder={
                      premium
                        ? register
                          ? field.name === "confirmPassword"
                            ? "رمز عبور را دوباره وارد کنید"
                            : "حداقل ۸ کاراکتر"
                          : "رمز عبور خود را وارد کنید"
                        : undefined
                    }
                  />
                ) : (
                  <Input
                    {...props}
                    dir={field.name === "email" ? "ltr" : undefined}
                    placeholder={
                      field.name === "email"
                        ? premium
                          ? "example@email.com"
                          : "name@example.com"
                        : premium
                          ? "نام کامل خود را وارد کنید"
                          : undefined
                    }
                  />
                )}
              </div>
              {field.name === "password" && register && !premium && (
                <p id="password-hint" className="text-xs leading-6 text-muted">
                  حداقل ۸ کاراکتر، شامل یک حرف و یک عدد.
                </p>
              )}
              {errors?.length ? (
                <p
                  id={`${field.name}-error`}
                  className="text-xs leading-6 text-danger"
                  role="alert"
                >
                  {errors.join("؛ ")}
                </p>
              ) : null}
              {field.name === "confirmPassword" && premium && register && (
                <PasswordGuidance
                  appearance="premium"
                  password={values.password ?? ""}
                  confirmation={values.confirmPassword ?? ""}
                />
              )}
            </div>
          );
        })}
        {!register && (
          <label
            className={
              premium
                ? "flex min-h-11 flex-wrap items-center gap-2 text-sm"
                : "flex items-center gap-2 text-sm"
            }
          >
            <input
              type="checkbox"
              checked={effectiveRemember}
              onChange={(event) => {
                const checked = event.target.checked;
                setValues((current) => ({
                  ...current,
                  email: current.email ?? rememberedEmail,
                }));
                setRemember(checked);
                rememberEmail(checked ? (values.email ?? rememberedEmail) : "");
              }}
              className="size-4 min-h-0! accent-primary"
              disabled={pending}
            />
            {premium
              ? "مرا به خاطر بسپار"
              : "ایمیل را تا بسته‌شدن این تب نگه دار"}
            {premium && (
              <span className={premiumStyles.rememberHint}>
                فقط ایمیل، تا بسته‌شدن این تب
              </span>
            )}
          </label>
        )}
        {(!state.ok || initialError) && (
          <p role="alert" className={`${styles.notice} ${styles.error}`}>
            {!state.ok ? state.error : initialError}
          </p>
        )}
        {register && !premium && (
          <PasswordGuidance
            password={values.password ?? ""}
            confirmation={values.confirmPassword ?? ""}
          />
        )}
        <Button
          type="submit"
          disabled={pending}
          className={premium ? premiumStyles.submit : "min-h-12 w-full"}
        >
          {premium && pending && (
            <LoaderCircle
              className="motion-safe:animate-spin"
              size={19}
              aria-hidden="true"
            />
          )}
          {pending
            ? "در حال انجام…"
            : register
              ? premium
                ? "ثبت‌نام"
                : "ساخت حساب کاربری"
              : "ورود"}
          {premium && !pending && (
            <ArrowLeft
              className={premiumStyles.submitArrow}
              size={20}
              aria-hidden="true"
            />
          )}
        </Button>
      </form>
      <p className="mt-7 text-center text-sm text-muted">
        {register
          ? premium
            ? "قبلاً حساب کاربری دارید؟ "
            : "قبلاً ثبت‌نام کرده‌اید؟ "
          : premium
            ? "حساب کاربری ندارید؟ "
            : "حساب ندارید؟ "}
        <Link
          className="font-semibold text-primary"
          href={`${linkMode === "preview" ? (register ? "/test/login" : "/test/signup") : register ? "/login" : "/register"}?callbackUrl=${encodeURIComponent(callbackUrl)}`}
        >
          {register ? "وارد شوید" : "ثبت‌نام کنید"}
        </Link>
      </p>
      {!premium && (
        <p className="mt-7 flex items-center justify-center gap-2 border-t border-border pt-5 text-xs text-muted">
          <ShieldIcon className="size-4" />
          ورود به حساب با ایمیل و رمز عبور
        </p>
      )}
    </section>
  );
}
