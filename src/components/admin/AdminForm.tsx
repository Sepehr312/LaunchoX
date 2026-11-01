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
import { ImageOff, Upload, type LucideIcon } from "lucide-react";
import { assetUrlSchema } from "@/validations/common";
import { imageFileSchema, imageUploadResultSchema } from "@/validations/image";
import type { ActionResult } from "@/lib/errors";

export function FormSection({
  title,
  description,
  children,
  icon: Icon,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  icon?: LucideIcon;
}) {
  const id = useId();
  return (
    <section className="admin-form-section" aria-labelledby={id}>
      <header>
        {Icon && (
          <span className="admin-form-section-icon">
            <Icon size={20} aria-hidden="true" />
          </span>
        )}
        <div>
          <h2 id={id}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </header>
      <div className="admin-form-grid">{children}</div>
    </section>
  );
}

export function FormField({
  label,
  error,
  hint,
  fullWidth = false,
  children,
  ...props
}: ComponentProps<"input"> & {
  label: string;
  error?: string[];
  hint?: string;
  fullWidth?: boolean;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={fullWidth ? "admin-field admin-span" : "admin-field"}>
      <label htmlFor={id}>
        {label}
        {props.required && <span className="admin-required">الزامی</span>}
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
      {(!!error?.length || hint) && (
        <div id={`${id}-help`}>
          {error?.length ? (
            <p className="admin-field-error">{error.join("، ")}</p>
          ) : (
            <p className="admin-hint">{hint}</p>
          )}
        </div>
      )}
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
        {props.required && <span className="admin-required">الزامی</span>}
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
        {props.required && <span className="admin-required">الزامی</span>}
      </label>
      <textarea
        {...props}
        id={id}
        rows={3}
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
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input {...props} type="checkbox" />
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

export function ImagePreview({
  src,
  alt,
  onUpload,
  onUploadingChange,
}: {
  src: string;
  alt: string;
  onUpload?: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [failed, setFailed] = useState<string>();
  const [error, setError] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const valid = assetUrlSchema.safeParse(src).success;
  return (
    <div className="admin-image-picker">
      <div className="admin-image-preview" aria-busy={uploading}>
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
        {onUpload && (
          <input
            type="file"
            className="admin-image-upload"
            accept="image/png,image/jpeg,image/webp,image/gif"
            aria-label={`بارگذاری یا جایگزینی ${alt}`}
            title="برای بارگذاری تصویر انتخاب کنید"
            disabled={uploading}
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!file) return;
              const parsed = imageFileSchema.safeParse(file);
              if (!parsed.success) {
                setError(parsed.error.issues[0]?.message ?? "تصویر معتبر نیست");
                return;
              }
              setError(undefined);
              setUploading(true);
              onUploadingChange?.(true);
              try {
                const form = new FormData();
                form.set("image", file);
                const response = await fetch("/api/admin/images", {
                  method: "POST",
                  body: form,
                });
                const body: unknown = await response.json();
                const result = imageUploadResultSchema.safeParse(body);
                if (!response.ok || !result.success) {
                  setError(
                    typeof body === "object" &&
                      body !== null &&
                      "error" in body &&
                      typeof body.error === "string"
                      ? body.error
                      : "بارگذاری تصویر انجام نشد؛ دوباره تلاش کنید",
                  );
                  return;
                }
                onUpload(result.data.data.url);
              } catch {
                setError("بارگذاری تصویر انجام نشد؛ دوباره تلاش کنید");
              } finally {
                setUploading(false);
                onUploadingChange?.(false);
              }
            }}
          />
        )}
      </div>
      {onUpload && (
        <p className="admin-upload-hint">
          <Upload size={14} aria-hidden="true" />
          برای انتخاب تصویر روی کادر بزنید.
        </p>
      )}
      {uploading && (
        <p role="status" className="admin-hint">
          در حال بارگذاری تصویر…
        </p>
      )}
      {error && (
        <p role="alert" className="admin-field-error">
          {error}
        </p>
      )}
    </div>
  );
}
