"use client";

import Image from "next/image";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type ComponentProps,
} from "react";
import { ImageOff } from "lucide-react";
import { assetUrlSchema } from "@/validations/common";
import type { ActionResult } from "@/lib/errors";

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="admin-form-section">
      <header>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      <div className="admin-form-grid">{children}</div>
    </section>
  );
}

export function FormField({
  label,
  error,
  hint,
  children,
  ...props
}: ComponentProps<"input"> & {
  label: string;
  error?: string[];
  hint?: string;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="admin-field">
      <label htmlFor={id}>
        {label}
        {props.required && <span className="admin-required"> (الزامی)</span>}
      </label>
      {children || (
        <input
          {...props}
          id={id}
          className="field-input"
          aria-invalid={!!error?.length}
          aria-describedby={error?.length || hint ? `${id}-help` : undefined}
        />
      )}
      <div id={`${id}-help`}>
        {error?.length ? (
          <p className="admin-field-error">{error.join("، ")}</p>
        ) : hint ? (
          <p className="admin-hint">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

export function FormSelect({
  label,
  error,
  children,
  ...props
}: ComponentProps<"select"> & { label: string; error?: string[] }) {
  const id = useId();
  return (
    <div className="admin-field">
      <label htmlFor={id}>
        {label}
        {props.required && " (الزامی)"}
      </label>
      <select
        {...props}
        id={id}
        className="field-input"
        aria-invalid={!!error?.length}
        aria-describedby={error?.length ? `${id}-error` : undefined}
      >
        {children}
      </select>
      {error?.length && (
        <p id={`${id}-error`} className="admin-field-error">
          {error.join("، ")}
        </p>
      )}
    </div>
  );
}

export function FormTextarea({
  label,
  error,
  ...props
}: ComponentProps<"textarea"> & { label: string; error?: string[] }) {
  const id = useId();
  return (
    <div className="admin-field admin-span">
      <label htmlFor={id}>
        {label}
        {props.required && " (الزامی)"}
      </label>
      <textarea
        {...props}
        id={id}
        rows={5}
        className="field-input"
        aria-invalid={!!error?.length}
        aria-describedby={error?.length ? `${id}-error` : undefined}
      />
      {error?.length && (
        <p id={`${id}-error`} className="admin-field-error">
          {error.join("، ")}
        </p>
      )}
    </div>
  );
}

export function FormToggle({
  label,
  description,
  ...props
}: ComponentProps<"input"> & { label: string; description?: string }) {
  return (
    <label className="admin-toggle">
      <input {...props} type="checkbox" />
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
    </label>
  );
}

export function FormFeedback({
  state,
  children,
}: {
  state: ActionResult<{ id: string }> | undefined;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state && !state.ok) ref.current?.focus();
  }, [state]);
  if (!state) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={state.ok ? "status" : "alert"}
      className={state.ok ? "admin-success" : "admin-error"}
    >
      {state.ok ? (
        <>
          {"تغییرات با موفقیت ذخیره شد. "}
          {children}
        </>
      ) : (
        state.error
      )}
    </div>
  );
}

export function ImagePreview({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState<string>();
  const valid = assetUrlSchema.safeParse(src).success;
  return (
    <div className="admin-image-preview">
      {valid && failed !== src ? (
        <Image
          src={src}
          alt={alt}
          width={140}
          height={140}
          unoptimized
          onError={() => setFailed(src)}
        />
      ) : (
        <span>
          <ImageOff size={28} aria-hidden="true" />
          <small>{src ? "تصویر در دسترس نیست" : "پیش‌نمایش تصویر"}</small>
        </span>
      )}
    </div>
  );
}
