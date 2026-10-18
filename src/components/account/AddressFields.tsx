"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { toPersianDigits } from "@/lib/format";
import { Input } from "@/components/ui/Input";
import { FieldErrorsContext } from "@/components/customer/CustomerField";
import {
  addressProvinces,
  filterAddressInput,
  getAddressCities,
  normalizeLocation,
} from "@/validations/address-fields";
import type { AddressDTO } from "@/types/dto";

const fields = [
  ["title", "عنوان آدرس", "مثلاً خانه یا محل کار", "off"],
  ["recipientName", "نام و نام خانوادگی گیرنده", "فقط حروف فارسی", "name"],
  ["mobile", "موبایل گیرنده", "۱۱ رقم و با ۰۹ شروع شود", "tel"],
  ["postalCode", "کد پستی", "کد پستی ۱۰ رقمی، بدون فاصله", "postal-code"],
  ["province", "استان", undefined, "address-level1"],
  ["city", "شهر", undefined, "address-level2"],
  [
    "addressLine",
    "نشانی کامل",
    "خیابان، کوچه، پلاک، طبقه و واحد را وارد کنید.",
    "street-address",
  ],
] as const;

function initialValues(address?: AddressDTO): Record<string, string> {
  return Object.fromEntries(
    fields.map(([name]) => [
      name,
      name === "province" || name === "city"
        ? normalizeLocation(address?.[name] ?? "")
        : toPersianDigits(address?.[name] ?? ""),
    ]),
  );
}

export function AddressFields({
  address,
  idPrefix = address?.id ?? "new",
  disabled = false,
}: {
  address?: AddressDTO;
  idPrefix?: string;
  disabled?: boolean;
}) {
  const [values, setValues] = useState(() => initialValues(address));
  const errors = useContext(FieldErrorsContext);
  const container = useRef<HTMLDivElement>(null);
  const cities = getAddressCities(values.province);
  useEffect(() => {
    const form = container.current?.closest("form");
    // Controlled province and city fields must also reset after a successful addition.
    const reset = (event: Event) => {
      if (!event.defaultPrevented) setValues(initialValues(address));
    };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [address]);
  return (
    <div ref={container} className="grid min-w-0 gap-5 sm:grid-cols-2">
      {fields.map(([name, label, hint, autoComplete]) => {
        const id = `${idPrefix}-${name}`;
        const fieldErrors = errors[name];
        const shared = {
          id,
          name,
          value: values[name],
          required: true,
          disabled,
          autoComplete,
          "aria-invalid": Boolean(fieldErrors?.length),
          "aria-describedby":
            [hint ? `${id}-hint` : "", fieldErrors?.length ? `${id}-error` : ""]
              .filter(Boolean)
              .join(" ") || undefined,
        };
        const update = (value: string) =>
          setValues((current) => ({
            ...current,
            [name]: filterAddressInput(name, value),
            ...(name === "province" ? { city: "" } : {}),
          }));
        return (
          <div
            key={name}
            className={`grid min-w-0 gap-2 text-sm ${name === "addressLine" ? "sm:col-span-2" : ""}`}
          >
            <label htmlFor={id}>{label}</label>
            {name === "province" || name === "city" ? (
              <select
                {...shared}
                disabled={disabled || (name === "city" && !values.province)}
                onChange={(event) => update(event.target.value)}
                className="min-h-12 w-full min-w-0 rounded-xl border border-border bg-surface px-3 py-2 text-base text-foreground focus-visible:outline-primary aria-invalid:border-danger"
              >
                <option value="">
                  {name === "province"
                    ? "استان را انتخاب کنید"
                    : values.province
                      ? "شهر را انتخاب کنید"
                      : "ابتدا استان را انتخاب کنید"}
                </option>
                {(name === "province" ? addressProvinces : cities).map(
                  (value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ),
                )}
              </select>
            ) : name === "addressLine" ? (
              <textarea
                {...shared}
                rows={4}
                onChange={(event) => update(event.target.value)}
                className="min-h-28 w-full min-w-0 resize-y rounded-xl border border-border bg-surface p-3 text-base text-foreground focus-visible:outline-primary aria-invalid:border-danger"
              />
            ) : (
              <Input
                {...shared}
                type={name === "mobile" ? "tel" : "text"}
                inputMode={
                  name === "mobile" || name === "postalCode"
                    ? "numeric"
                    : "text"
                }
                maxLength={
                  name === "mobile"
                    ? 11
                    : name === "postalCode"
                      ? 10
                      : undefined
                }
                onChange={(event) => update(event.target.value)}
                className="text-base"
              />
            )}
            {hint && (
              <span id={`${id}-hint`} className="text-xs leading-6 text-muted">
                {hint}
              </span>
            )}
            {fieldErrors?.length ? (
              <span
                id={`${id}-error`}
                role="alert"
                className="text-xs text-danger"
              >
                {fieldErrors.join("؛ ")}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
