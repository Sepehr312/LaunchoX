"use client";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/Input";
import { filterMobileInput } from "@/validations/otp";

type Props = Omit<
  ComponentProps<"input">,
  | "type"
  | "inputMode"
  | "maxLength"
  | "minLength"
  | "pattern"
  | "value"
  | "defaultValue"
  | "onChange"
> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};
export function MobileInput({
  value,
  defaultValue = "",
  onValueChange,
  ...props
}: Props) {
  const [localValue, setLocalValue] = useState(() =>
    filterMobileInput(defaultValue, ""),
  );
  const current = value ?? localValue;
  return (
    <Input
      {...props}
      type="tel"
      inputMode="numeric"
      dir="ltr"
      autoComplete="tel"
      minLength={11}
      maxLength={11}
      pattern="[0۰٠][9۹٩][0-9۰-۹٠-٩]{9}"
      value={current}
      onChange={(event) => {
        const next = filterMobileInput(event.target.value, current);
        event.currentTarget.value = next;
        event.currentTarget.setCustomValidity("");
        if (value === undefined) setLocalValue(next);
        onValueChange?.(next);
      }}
      onInvalid={(event) =>
        event.currentTarget.setCustomValidity(
          "شمارهٔ موبایل باید ۱۱ رقم و با ۰۹ شروع شود",
        )
      }
    />
  );
}
