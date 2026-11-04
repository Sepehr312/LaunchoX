"use client";

import { useState, useTransition } from "react";
import { Eye, Info, Mail, MapPin, Phone, Save, Snowflake } from "lucide-react";
import { saveContentAction } from "@/actions/admin/content.actions";
import { FormField, FormTextarea } from "@/components/admin/AdminForm";
import { normalizeDigits, toPersianDigits } from "@/lib/format";
import { contactSchema, type ContentInput } from "@/validations/content";
import styles from "@/components/admin/ContactEditor.module.css";

type ContactContent = Extract<ContentInput, { key: "contact" }>;
type ContactData = ContactContent["data"];
type FieldErrors = Partial<Record<keyof ContactData, string[]>>;

export function ContactEditor({ initial }: { initial: ContactContent }) {
  const [value, setValue] = useState(initial.data);
  const [saved, setSaved] = useState(initial.data);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);
  const phoneResult = contactSchema.shape.phone.safeParse(value.phone);
  const emailResult = contactSchema.shape.email.safeParse(value.email);
  const addressResult = contactSchema.shape.address.safeParse(value.address);
  const phone = phoneResult.success ? phoneResult.data : "";
  const email = emailResult.success ? emailResult.data : "";
  const address = addressResult.success ? addressResult.data : "";
  const phoneTarget = normalizeDigits(phone).replace(/[^+0-9]/g, "");
  const empty =
    !value.phone.trim() && !value.email.trim() && !value.address.trim();

  function update(key: keyof ContactData, text: string) {
    setValue((current) => ({ ...current, [key]: text }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setNotice(undefined);
  }

  return (
    <form
      className={styles.editor}
      aria-busy={pending}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        setNotice(undefined);
        const parsed = contactSchema.safeParse(value);
        if (!parsed.success) {
          const next: FieldErrors = {};
          for (const issue of parsed.error.issues) {
            const key = issue.path[0];
            if (key === "phone" || key === "email" || key === "address") {
              next[key] = [...(next[key] ?? []), issue.message];
            }
          }
          setErrors(next);
          setNotice({
            ok: false,
            text: "اطلاعات مشخص‌شده را اصلاح کنید و دوباره ذخیره کنید.",
          });
          return;
        }
        setErrors({});
        const data = parsed.data;
        startTransition(async () => {
          try {
            const result = await saveContentAction({ key: "contact", data });
            if (result.ok) {
              setValue(data);
              setSaved(data);
            }
            setNotice({
              ok: result.ok,
              text: result.ok ? "تغییرات ذخیره شد" : result.error,
            });
          } catch {
            setNotice({
              ok: false,
              text: "ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.",
            });
          }
        });
      }}
    >
      <div className={styles.info}>
        <Info size={20} aria-hidden="true" />
        <p>
          این اطلاعات در فوتر و بخش‌های ارتباط با فروشگاه نمایش داده می‌شوند.
        </p>
      </div>
      <fieldset className={styles.controls} disabled={pending}>
        <div className={styles.layout}>
          <section
            className={`admin-panel ${styles.formPanel}`}
            aria-labelledby="contact-form-title"
          >
            <header className={styles.heading}>
              <h2 id="contact-form-title">
                <Phone size={22} aria-hidden="true" />
                اطلاعات تماس فروشگاه
              </h2>
              <p className="admin-hint">راه‌های ارتباطی اصلی با مشتریان</p>
            </header>
            <FormField
              label="شماره تماس"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              maxLength={40}
              value={value.phone}
              onChange={(event) =>
                update("phone", normalizeDigits(event.target.value))
              }
              error={errors.phone}
              hint="شماره تماس پاسخ‌گویی به مشتریان"
            />
            <FormField
              label="ایمیل پشتیبانی"
              type="email"
              inputMode="email"
              autoComplete="email"
              dir="ltr"
              maxLength={254}
              value={value.email}
              onChange={(event) => update("email", event.target.value)}
              error={errors.email}
              hint="نشانی ایمیل دریافت پیام‌های مشتریان"
            />
            <div className={styles.addressField}>
              <FormTextarea
                label="نشانی فروشگاه"
                autoComplete="street-address"
                maxLength={1000}
                value={value.address}
                onChange={(event) => update("address", event.target.value)}
                error={errors.address}
              />
              <p className="admin-hint">
                نشانی کامل برای مراجعه و ارتباط با فروشگاه
              </p>
            </div>
          </section>
          <section
            className={`admin-panel ${styles.previewPanel}`}
            aria-labelledby="contact-preview-title"
          >
            <header className={styles.heading}>
              <h2 id="contact-preview-title">
                <Eye size={22} aria-hidden="true" />
                پیش‌نمایش اطلاعات تماس
              </h2>
              <p className="admin-hint">نمایش تقریبی در فروشگاه</p>
            </header>
            <div className={styles.preview}>
              <div className={styles.logo}>
                <Snowflake size={28} aria-hidden="true" />
                <strong dir="ltr">
                  Launcho<span>X</span>
                </strong>
              </div>
              <h3>ارتباط با ما</h3>
              {empty ? (
                <p className={styles.empty}>
                  اطلاعات تماس رسمی هنوز منتشر نشده است.
                </p>
              ) : (
                <address className={styles.contacts}>
                  <div>
                    <Phone size={20} aria-hidden="true" />
                    <bdi>
                      {phone
                        ? toPersianDigits(phone)
                        : "شماره تماس ثبت نشده است."}
                    </bdi>
                  </div>
                  <div>
                    <Mail size={20} aria-hidden="true" />
                    <bdi>{email || "ایمیل ثبت نشده است."}</bdi>
                  </div>
                  <div>
                    <MapPin size={20} aria-hidden="true" />
                    <span>
                      {address
                        ? toPersianDigits(address)
                        : "نشانی ثبت نشده است."}
                    </span>
                  </div>
                </address>
              )}
              {phoneTarget && (
                <a className={styles.call} href={`tel:${phoneTarget}`}>
                  <Phone size={17} aria-hidden="true" />
                  تماس با فروشگاه
                </a>
              )}
            </div>
          </section>
        </div>
        <footer className={`admin-panel ${styles.footer}`}>
          <p className="admin-hint">
            {dirty
              ? "تغییرات ذخیره‌نشده دارید؛ برای نمایش در فروشگاه آن‌ها را ذخیره کنید."
              : "تغییرات پس از ذخیره در فروشگاه نمایش داده می‌شوند."}
          </p>
          <div className={styles.actions}>
            <button
              className={styles.outline}
              type="button"
              disabled={!dirty}
              onClick={() => {
                if (!window.confirm("تغییرات ذخیره‌نشده کنار گذاشته شوند؟"))
                  return;
                setValue(saved);
                setErrors({});
                setNotice(undefined);
              }}
            >
              انصراف
            </button>
            <button className={styles.primary} type="submit" disabled={!dirty}>
              <Save size={18} aria-hidden="true" />
              {pending ? "در حال ذخیره…" : "ذخیره تغییرات"}
            </button>
          </div>
        </footer>
      </fieldset>
      {notice && (
        <p
          role={notice.ok ? "status" : "alert"}
          tabIndex={-1}
          ref={(node) => {
            node?.focus();
          }}
          className={notice.ok ? "admin-success" : "admin-error"}
        >
          {notice.text}
        </p>
      )}
    </form>
  );
}
