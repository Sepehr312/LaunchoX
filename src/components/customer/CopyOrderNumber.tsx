"use client";
import { useEffect, useState } from "react";
import { toPersianDigits } from "@/lib/format";
export function CopyOrderNumber({ number }: { number: string }) {
  const [status, setStatus] = useState<"" | "copied" | "error">("");
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(""), 3500);
    return () => clearTimeout(timer);
  }, [status]);
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-2">
      <span dir="ltr" className="break-all">
        {toPersianDigits(number)}
      </span>
      <button
        type="button"
        aria-label="کپی شماره سفارش"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border text-primary focus-visible:outline-2 focus-visible:outline-primary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(number);
            setStatus("copied");
          } catch {
            setStatus("error");
          }
        }}
      >
        <svg
          className="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M16 8V4H4v12h4" />
        </svg>
      </button>
      <span
        role="status"
        className={`text-xs font-normal ${status === "error" ? "text-danger" : "text-success"}`}
      >
        {status === "copied"
          ? "کپی شد"
          : status === "error"
            ? "کپی ممکن نشد؛ شماره را دستی کپی کنید."
            : ""}
      </span>
    </span>
  );
}
