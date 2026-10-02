"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction, registerAction } from "@/actions/auth.actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { AuthActionState } from "@/types/auth";

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
  const initialState: AuthActionState = { ok: true, data: undefined };
  const [state, action, pending] = useActionState(
    register ? registerAction : loginAction,
    initialState,
  );
  const fields = [
    ...(register
      ? [{ name: "name", label: "نام", type: "text", autoComplete: "name" }]
      : []),
    { name: "email", label: "ایمیل", type: "email", autoComplete: "email" },
    {
      name: "password",
      label: "رمز عبور",
      type: "password",
      autoComplete: register ? "new-password" : "current-password",
    },
    ...(register
      ? [
          {
            name: "confirmPassword",
            label: "تکرار رمز عبور",
            type: "password",
            autoComplete: "new-password",
          },
        ]
      : []),
  ];
  return (
    <Card className="w-full max-w-md">
      <h1 className="mb-6 text-xl font-bold">
        {register ? "ثبت‌نام" : "ورود"}
      </h1>
      <form action={action} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        {fields.map((field) => {
          const errors = !state.ok
            ? state.fieldErrors?.[field.name]
            : undefined;
          return (
            <div key={field.name} className="space-y-2">
              <label htmlFor={field.name} className="block text-sm">
                {field.label}
              </label>
              <Input
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                value={values[field.name] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field.name]: event.target.value,
                  }))
                }
                id={field.name}
                required
                aria-invalid={Boolean(errors?.length)}
                aria-describedby={
                  errors?.length ? `${field.name}-error` : undefined
                }
              />
              {errors?.length ? (
                <p id={`${field.name}-error`} className="text-sm text-danger">
                  {errors.join("؛ ")}
                </p>
              ) : null}
            </div>
          );
        })}
        {!state.ok || initialError ? (
          <p role="alert" className="text-sm text-danger">
            {!state.ok ? state.error : initialError}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "در حال انجام…" : register ? "ثبت‌نام" : "ورود"}
        </Button>
      </form>
      <p className="mt-5 text-sm">
        <Link
          className="text-primary underline"
          href={`${register ? "/login" : "/register"}?callbackUrl=${encodeURIComponent(callbackUrl)}`}
        >
          {register ? "حساب دارید؟ ورود" : "حساب ندارید؟ ثبت‌نام"}
        </Link>
      </p>
    </Card>
  );
}
