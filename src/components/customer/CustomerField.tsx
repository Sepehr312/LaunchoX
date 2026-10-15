"use client";
import { createContext, useContext, type ComponentProps } from "react";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/customer/PasswordInput";
export const FieldErrorsContext = createContext<
  Record<string, string[] | undefined>
>({});
export function CustomerField({
  label,
  hint,
  ...props
}: ComponentProps<"input"> & { name: string; label: string; hint?: string }) {
  const errors = useContext(FieldErrorsContext)[props.name];
  const id = props.id ?? props.name;
  const input = {
    ...props,
    id,
    "aria-invalid": Boolean(errors?.length),
    "aria-describedby":
      [hint ? `${id}-hint` : "", errors?.length ? `${id}-error` : ""]
        .filter(Boolean)
        .join(" ") || undefined,
  };
  return (
    <label htmlFor={id} className="grid min-w-0 gap-2 text-sm">
      <span>{label}</span>
      {props.type === "password" ? (
        <PasswordInput {...input} aria-label={label} />
      ) : (
        <Input {...input} />
      )}
      {hint && (
        <span id={`${id}-hint`} className="text-xs leading-6 text-muted">
          {hint}
        </span>
      )}
      {errors?.length ? (
        <span id={`${id}-error`} role="alert" className="text-xs text-danger">
          {errors.join("؛ ")}
        </span>
      ) : null}
    </label>
  );
}
