"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "@/components/admin/OrderDetail.module.css";

export function CopyValue({ value, label }: { value: string; label: string }) {
  const [status, setStatus] = useState<"" | "copied" | "error">("");
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(""), 3000);
    return () => clearTimeout(timer);
  }, [status]);
  return (
    <span className={styles.copyControl}>
      <button
        type="button"
        className={styles.copyButton}
        aria-label={`کپی ${label}`}
        title={`کپی ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setStatus("copied");
          } catch {
            setStatus("error");
          }
        }}
      >
        {status === "copied" ? (
          <Check size={16} aria-hidden="true" />
        ) : (
          <Copy size={16} aria-hidden="true" />
        )}
      </button>
      <span role="status" className={styles.copyStatus}>
        {status === "copied"
          ? "کپی شد"
          : status === "error"
            ? "کپی ممکن نشد؛ متن را دستی کپی کنید."
            : ""}
      </span>
    </span>
  );
}
