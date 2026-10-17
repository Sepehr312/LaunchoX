"use client";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/Input";
import styles from "@/components/customer/customer.module.css";
export function PasswordInput(props: ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.password}>
      <Input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className={styles.eye}
        onPointerDown={(event) => {
          // Keep the mobile keyboard open so a focus change cannot interrupt the tap.
          if (event.button === 0) event.preventDefault();
        }}
        onClick={() => setVisible((current) => !current)}
        aria-label={`${visible ? "مخفی کردن" : "نمایش"} ${props["aria-label"] ?? "رمز عبور"}`}
        aria-pressed={visible}
        disabled={props.disabled}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </div>
  );
}
