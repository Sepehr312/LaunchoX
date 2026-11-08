"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeDigits, toPersianDigits } from "@/lib/format";
import styles from "@/components/auth/otp-code-input.module.css";

const slots = [0, 1, 2, 3, 4, 5];
const digitsOnly = (value: string) => normalizeDigits(value).replace(/\D/g, "");

export function OtpCodeInput({
  id,
  name = "code",
  disabled = false,
  describedBy,
}: {
  id: string;
  name?: string;
  disabled?: boolean;
  describedBy?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const form = input.current?.form;
    const reset = () => {
      setValue("");
      setActive(0);
    };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, []);

  return (
    <span className={styles.control} dir="ltr" data-disabled={disabled}>
      <span className={styles.slots} aria-hidden="true">
        {slots.map((index) => (
          <span
            key={index}
            className={styles.slot}
            data-active={focused && active === index}
            data-filled={Boolean(value[index])}
          >
            {toPersianDigits(value[index] ?? "")}
          </span>
        ))}
      </span>
      <input
        ref={input}
        className={styles.input}
        id={id}
        name={name}
        type="text"
        dir="ltr"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={6}
        pattern="[0-9]{6}"
        required
        disabled={disabled}
        aria-describedby={describedBy}
        value={value}
        onChange={(event) => {
          const field = event.currentTarget;
          field.setCustomValidity("");
          const position = digitsOnly(
            field.value.slice(0, field.selectionStart ?? field.value.length),
          ).length;
          const next = digitsOnly(field.value).slice(0, 6);
          setValue(next);
          setActive(Math.min(position, 5));
          if (next !== field.value) {
            requestAnimationFrame(() =>
              field.setSelectionRange(position, position),
            );
          }
        }}
        onPaste={(event) => {
          event.preventDefault();
          const field = event.currentTarget;
          field.setCustomValidity("");
          const start = field.selectionStart ?? value.length;
          const end = field.selectionEnd ?? start;
          const pasted = digitsOnly(event.clipboardData.getData("text"));
          const next = (
            value.slice(0, start) +
            pasted +
            value.slice(end)
          ).slice(0, 6);
          const position = Math.min(start + pasted.length, next.length);
          setValue(next);
          setActive(Math.min(position, 5));
          requestAnimationFrame(() =>
            field.setSelectionRange(position, position),
          );
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onInvalid={(event) =>
          event.currentTarget.setCustomValidity("کد تأیید باید شش رقم باشد")
        }
        onSelect={(event) =>
          setActive(Math.min(event.currentTarget.selectionStart ?? 0, 5))
        }
        onClick={(event) => {
          const field = event.currentTarget;
          const bounds = field.getBoundingClientRect();
          const index = Math.max(
            0,
            Math.min(
              5,
              Math.floor(((event.clientX - bounds.left) / bounds.width) * 6),
            ),
          );
          const position = Math.min(index, value.length);
          field.setSelectionRange(
            position,
            Math.min(position + 1, value.length),
          );
          setActive(position);
        }}
      />
    </span>
  );
}
