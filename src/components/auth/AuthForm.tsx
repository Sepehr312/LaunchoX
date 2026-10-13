"use client";
import { useActionState, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { loginAction, registerAction } from "@/actions/auth.actions";
import { loginSchema, registerSchema } from "@/validations/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/customer/PasswordInput";
import { SnowflakeIcon, ShieldIcon } from "@/components/store/Icons";
import styles from "@/components/customer/customer.module.css";
import type { AuthActionState } from "@/types/auth";
function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
function readRememberedEmail() {
  try {
    const email = sessionStorage.getItem("launchox-remember-email");
    return email && loginSchema.shape.email.safeParse(email).success
      ? email
      : "";
  } catch {
    return "";
  }
}
export function AuthForm({
  mode,
  callbackUrl,
  initialError,
}: {
  mode: "login" | "register";
  callbackUrl: string;
  initialError?: string;
}) {
  const register = mode === "register";
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
    <section className={styles.authCard}>
      <Link href="/" className={styles.brand}>
        <SnowflakeIcon />
        <span>لانچ‌اوکس</span>
      </Link>
      <h1 className="mt-8 text-2xl font-bold">
        {register ? "حساب خود را بسازید" : "خوش آمدید"}
      </h1>
      <p className="mt-3 mb-8 text-sm leading-7 text-muted">
        {register
          ? "برای مدیریت سفارش‌ها و آدرس‌ها، ثبت‌نام کنید."
          : "برای ورود به فضای شخصی خود، اطلاعات حسابتان را وارد کنید."}
      </p>
      <form
        action={action}
        noValidate
        aria-busy={pending}
        className="grid gap-5"
        onSubmit={(event) => {
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
            try {
              if (effectiveRemember)
                sessionStorage.setItem(
                  "launchox-remember-email",
                  values.email ?? rememberedEmail,
                );
              else sessionStorage.removeItem("launchox-remember-email");
            } catch {
              /* Login remains available when browser storage is blocked. */
            }
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
            "aria-describedby": errors?.length
              ? `${field.name}-error`
              : field.name === "password" && register
                ? "password-hint"
                : undefined,
            onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
              setValues((current) => ({
                ...current,
                [field.name]: event.target.value,
              }));
              setClientErrors((current) => ({ ...current, [field.name]: [] }));
            },
          };
          return (
            <div key={field.name} className="grid gap-2">
              <label htmlFor={field.name}>{field.label}</label>
              {field.type === "password" ? (
                <PasswordInput {...props} />
              ) : (
                <Input
                  {...props}
                  dir={field.name === "email" ? "ltr" : undefined}
                  placeholder={
                    field.name === "email" ? "name@example.com" : undefined
                  }
                />
              )}
              {field.name === "password" && register && (
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
            </div>
          );
        })}
        {!register && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={effectiveRemember}
              onChange={(event) => {
                setRemember(event.target.checked);
              }}
              className="size-4 min-h-0! accent-primary"
              disabled={pending}
            />
            مرا به خاطر بسپار{" "}
            <span className="text-xs text-muted">(ایمیل در این نشست)</span>
          </label>
        )}
        {(!state.ok || initialError) && (
          <p role="alert" className={`${styles.notice} ${styles.error}`}>
            {!state.ok ? state.error : initialError}
          </p>
        )}
        <Button type="submit" disabled={pending} className="min-h-12 w-full">
          {pending ? "در حال انجام…" : register ? "ساخت حساب کاربری" : "ورود"}
        </Button>
      </form>
      <p className="mt-7 text-center text-sm text-muted">
        {register ? "قبلاً ثبت‌نام کرده‌اید؟ " : "حساب ندارید؟ "}
        <Link
          className="font-semibold text-primary"
          href={`${register ? "/login" : "/register"}?callbackUrl=${encodeURIComponent(callbackUrl)}`}
        >
          {register ? "وارد شوید" : "ثبت‌نام کنید"}
        </Link>
      </p>
      <p className="mt-7 flex items-center justify-center gap-2 border-t border-border pt-5 text-xs text-muted">
        <ShieldIcon className="size-4" />
        ورود به حساب با ایمیل و رمز عبور
      </p>
    </section>
  );
}
