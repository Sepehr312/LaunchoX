"use client";
import { useEffect, useRef, useState } from "react";
import { toPersianDigits } from "@/lib/format";
export function CopyOrderNumber({ number }: { number: string }) {
  const numberRef = useRef<HTMLSpanElement>(null);
  const [status, setStatus] = useState<"" | "copied" | "selected" | "error">(
    "",
  );
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(""), 3500);
    return () => clearTimeout(timer);
  }, [status]);
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-2">
      <span ref={numberRef} dir="ltr" className="break-all select-text">
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
            try {
              const selection = window.getSelection();
              if (selection && numberRef.current) {
                const range = document.createRange();
                range.selectNodeContents(numberRef.current);
                selection.removeAllRanges();
                selection.addRange(range);
                setStatus("selected");
                return;
              }
            } catch {
              // Selection may also be unavailable in restricted browsers.
            }
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
        className={`text-xs font-normal ${status === "error" ? "text-danger" : status === "copied" ? "text-success" : "text-muted"}`}
      >
        {status === "copied"
          ? "کپی شد"
          : status === "selected"
            ? "کپی خودکار ممکن نشد؛ شماره انتخاب شده را کپی کنید."
            : status === "error"
              ? "کپی ممکن نشد؛ شماره را دستی کپی کنید."
              : ""}
      </span>
    </span>
  );
}
