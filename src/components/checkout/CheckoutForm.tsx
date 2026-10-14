"use client";

import { useActionState, useState } from "react";
import {
  checkoutAction,
  addCheckoutAddressAction,
} from "@/actions/checkout.actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import styles from "@/components/customer/customer.module.css";
import { addressSchema } from "@/validations/address";
import { toPersianDigits } from "@/lib/format";
import type { AddressDTO } from "@/types/dto";
import type { ActionResult } from "@/lib/errors";

function FormErrors({ state }: { state: ActionResult<unknown> | undefined }) {
  return state && !state.ok ? (
    <p role="alert" className={`${styles.notice} ${styles.error}`}>
      {state.error}
    </p>
  ) : null;
}

const addressFields = [
  ["title", "عنوان آدرس", "text"],
  ["recipientName", "نام گیرنده", "text"],
  ["mobile", "موبایل گیرنده", "tel"],
  ["province", "استان", "text"],
  ["city", "شهر", "text"],
  ["postalCode", "کد پستی", "text"],
  ["addressLine", "نشانی کامل", "text"],
] as const;

export function CheckoutForm({ addresses }: { addresses: AddressDTO[] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>(
    {},
  );
  const [note, setNote] = useState("");
  const [state, action, pending] = useActionState(checkoutAction, undefined);
  const [addressState, addressAction, addressPending] = useActionState(
    addCheckoutAddressAction,
    undefined,
  );
  const [selected, setSelected] = useState(
    addresses.find((address) => address.isDefault)?.id ??
      addresses[0]?.id ??
      "",
  );
  const available = addressState?.ok ? addressState.data : addresses;
  const effectiveSelected = available.some((address) => address.id === selected)
    ? selected
    : (available.at(-1)?.id ?? "");
  return (
    <div className="grid min-w-0 gap-6">
      <form action={action} className="checkout-panel">
        <p className="section-kicker">مقصد انتخاب‌های شما</p>
        <h2 className="mt-2 mb-6 text-xl font-bold">آدرس ارسال</h2>
        <fieldset disabled={pending} className="grid gap-3">
          <legend className="sr-only">انتخاب آدرس ارسال</legend>
          {available.length ? (
            available.map((address) => (
              <label key={address.id} className="checkout-address">
                <input
                  type="radio"
                  name="addressId"
                  value={address.id}
                  checked={effectiveSelected === address.id}
                  onChange={() => setSelected(address.id)}
                  required
                  className="mt-1 accent-primary"
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 font-semibold">
                    {address.title} · {address.recipientName}
                    {effectiveSelected === address.id && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                        <svg
                          className="size-4"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          aria-hidden="true"
                        >
                          <path d="m4 10 4 4 8-8" />
                        </svg>
                        انتخاب شده
                      </span>
                    )}
                  </span>
                  <span className="mt-2 block text-sm leading-7 text-muted">
                    {address.province}، {address.city}، {address.addressLine}
                  </span>
                  <span className="block text-xs leading-7 text-muted">
                    کد پستی {toPersianDigits(address.postalCode)} ·{" "}
                    {toPersianDigits(address.mobile)}
                  </span>
                </span>
              </label>
            ))
          ) : (
            <p className="text-sm text-muted">
              هنوز آدرسی ندارید؛ آدرس ارسال را در فرم زیر اضافه کنید.
            </p>
          )}
        </fieldset>
        {state && !state.ok && state.fieldErrors?.addressId && (
          <p className="mt-2 text-sm text-danger">
            {state.fieldErrors.addressId.join("؛ ")}
          </p>
        )}
        <label className="mt-6 grid gap-2 text-sm">
          یادداشت سفارش (اختیاری)
          <textarea
            name="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            disabled={pending}
            aria-invalid={!!(state && !state.ok && state.fieldErrors?.note)}
            className="min-h-28 w-full resize-y rounded-xl border border-border bg-surface p-3 text-foreground focus-visible:outline-primary"
          />
          {state && !state.ok && state.fieldErrors?.note && (
            <span className="text-danger">
              {state.fieldErrors.note.join("؛ ")}
            </span>
          )}
        </label>
        <div className="mt-6 border-t border-border pt-5">
          <p className="mb-4 text-xs leading-6 text-muted">
            موجودی هنگام ثبت سفارش رزرو می‌شود. پرداخت در این مرحله از طریق
            درگاه آزمایشی انجام می‌شود و مبلغ واقعی پرداخت نخواهید کرد.
          </p>
          <Button
            type="submit"
            disabled={pending || !available.length || addressPending}
            className="w-full"
          >
            {pending ? "در حال ثبت سفارش…" : "پرداخت"}
          </Button>
        </div>
        <FormErrors state={state} />
      </form>
      {available.length < 5 && (
        <details
          className="checkout-panel"
          open={!available.length || !!addressState}
        >
          <summary className="cursor-pointer font-semibold">
            افزودن آدرس جدید
          </summary>
          <form
            noValidate
            onSubmit={(event) => {
              const parsed = addressSchema.safeParse(
                Object.fromEntries(new FormData(event.currentTarget)),
              );
              if (!parsed.success) {
                event.preventDefault();
                const errors: Record<string, string[]> = {};
                for (const issue of parsed.error.issues)
                  (errors[String(issue.path[0])] ??= []).push(issue.message);
                setClientErrors(errors);
                event.currentTarget
                  .querySelector<HTMLInputElement>(
                    `[name="${String(parsed.error.issues[0]?.path[0])}"]`,
                  )
                  ?.focus();
              } else setClientErrors({});
            }}
            action={addressAction}
            className="mt-6 grid gap-4 sm:grid-cols-2"
          >
            {addressFields.map(([name, label, type]) => (
              <div
                key={name}
                className={
                  name === "addressLine"
                    ? "grid gap-2 text-sm sm:col-span-2"
                    : "grid gap-2 text-sm"
                }
              >
                <label htmlFor={`checkout-${name}`}>{label}</label>
                <Input
                  id={`checkout-${name}`}
                  name={name}
                  value={values[name] ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [name]: event.target.value,
                    }))
                  }
                  autoComplete={
                    name === "postalCode"
                      ? "postal-code"
                      : name === "addressLine"
                        ? "street-address"
                        : name === "mobile"
                          ? "tel"
                          : name === "recipientName"
                            ? "name"
                            : "off"
                  }
                  type={type}
                  required
                  disabled={addressPending}
                  inputMode={
                    name === "postalCode" || name === "mobile"
                      ? "numeric"
                      : undefined
                  }
                  aria-invalid={
                    !!clientErrors[name]?.length ||
                    !!(
                      addressState &&
                      !addressState.ok &&
                      addressState.fieldErrors?.[name]
                    )
                  }
                />
                {clientErrors[name]?.length ? (
                  <span role="alert" className="text-xs text-danger">
                    {clientErrors[name].join("؛ ")}
                  </span>
                ) : null}
                {name === "postalCode" && (
                  <span className="text-xs text-muted">
                    کد پستی ۱۰ رقمی، بدون فاصله
                  </span>
                )}
                {name === "addressLine" && (
                  <span className="text-xs text-muted">
                    خیابان، کوچه، پلاک، طبقه و واحد
                  </span>
                )}
                {addressState &&
                  !addressState.ok &&
                  addressState.fieldErrors?.[name] && (
                    <span className="text-danger">
                      {addressState.fieldErrors[name].join("؛ ")}
                    </span>
                  )}
              </div>
            ))}
            <Button
              type="submit"
              variant="secondary"
              disabled={addressPending || pending}
              className="sm:col-span-2"
            >
              {addressPending ? "در حال ذخیره…" : "ذخیرهٔ آدرس"}
            </Button>
            {addressState?.ok && (
              <p role="status" className="text-sm text-success sm:col-span-2">
                آدرس اضافه شد؛ مقصد سفارش را انتخاب کنید.
              </p>
            )}
            <FormErrors state={addressState} />
          </form>
        </details>
      )}
    </div>
  );
}
