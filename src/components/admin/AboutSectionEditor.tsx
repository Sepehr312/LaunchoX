"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Save } from "lucide-react";
import { mutateAboutSectionAction } from "@/actions/admin/content.actions";
import {
  AboutSectionFields,
  EditorToggle,
} from "@/components/admin/AboutSectionFields";
import { aboutTemplates } from "@/components/admin/about-templates";
import type { AboutContact } from "@/components/store/AboutSections";
import {
  aboutMutationSchema,
  type AboutSection,
} from "@/validations/about-sections";
import styles from "./AboutEditor.module.css";

export function AboutSectionEditor({
  initial,
  contact,
  create = false,
}: {
  initial: AboutSection;
  contact: AboutContact;
  create?: boolean;
}) {
  const [section, setSection] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [notice, setNotice] = useState<{ ok: boolean; text: string }>();
  const noticeRef = useRef<HTMLDivElement>(null);
  const lock = useRef(false);
  const router = useRouter();
  const dirty = JSON.stringify(section) !== JSON.stringify(saved);
  const busy = pending || uploading;
  const label =
    aboutTemplates.find((item) => item.type === initial.template)?.title ??
    initial.title;

  useEffect(() => {
    if (!dirty && !uploading) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, uploading]);
  useEffect(() => {
    if (notice && !notice.ok) noticeRef.current?.focus();
  }, [notice]);

  function canLeave() {
    return (
      !busy &&
      (!dirty || window.confirm("تغییرات ذخیره‌نشده کنار گذاشته شوند؟"))
    );
  }

  return (
    <div className={styles.editor}>
      <header className="admin-panel admin-page-header admin-approved-header">
        <div>
          <p className="admin-eyebrow">محتوای فروشگاه / درباره ما</p>
          <h1>
            {create ? "افزودن بخش" : "ویرایش بخش"}: {label}
          </h1>
          <p className="admin-hint mt-2">
            تغییرات این بخش را به‌صورت مستقل ذخیره کنید.
          </p>
        </div>
        <Link
          href="/admin/content?section=about"
          className={styles.backLink}
          aria-disabled={busy}
          onClick={(event) => {
            if (!canLeave()) event.preventDefault();
          }}
        >
          <ArrowRight size={18} />
          بازگشت به پیش‌نمایش
        </Link>
      </header>
      {notice && (
        <div
          ref={noticeRef}
          tabIndex={-1}
          role={notice.ok ? "status" : "alert"}
          className={notice.ok ? "admin-success" : "admin-error"}
        >
          {notice.text}
        </div>
      )}
      <form
        noValidate
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          if (busy || lock.current) return;
          setNotice(undefined);
          const parsed = aboutMutationSchema.safeParse({
            operation: "save",
            section,
            create,
          });
          if (!parsed.success) {
            const next: Record<string, string[]> = {};
            for (const issue of parsed.error.issues) {
              const path = issue.path.slice(1).join(".");
              next[path] = [...(next[path] ?? []), issue.message];
            }
            setErrors(next);
            setNotice({
              ok: false,
              text:
                parsed.error.issues[0]?.message ?? "اطلاعات بخش را بررسی کنید.",
            });
            return;
          }
          lock.current = true;
          startTransition(async () => {
            try {
              const result = await mutateAboutSectionAction(parsed.data);
              if (result.ok) {
                const updated = result.data.sections.find(
                  (item) => item.id === section.id,
                );
                if (updated) {
                  setSection(updated);
                  setSaved(updated);
                }
                setErrors({});
                router.replace("/admin/content?section=about");
              }
              setNotice({
                ok: result.ok,
                text: result.ok ? "تغییرات این بخش ذخیره شد." : result.error,
              });
            } catch {
              setNotice({
                ok: false,
                text: "ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.",
              });
            } finally {
              lock.current = false;
            }
          });
        }}
      >
        <fieldset disabled={pending} className={styles.controls}>
          <section className={`admin-panel ${styles.editPanel}`}>
            <header className={styles.heading}>
              <h2>محتوای بخش</h2>
              <EditorToggle
                label="نمایش بخش"
                checked={section.isActive !== false}
                onChange={(isActive) => {
                  setSection((value) => ({ ...value, isActive }));
                  setNotice(undefined);
                }}
              />
            </header>
            <AboutSectionFields
              section={section}
              contact={contact}
              onChange={(patch) => {
                setSection((value) => ({ ...value, ...patch, id: initial.id }));
                setErrors({});
                setNotice(undefined);
              }}
              onUploadingChange={setUploading}
              errors={errors}
            />
          </section>
          <footer className={`admin-panel ${styles.footer}`}>
            <p className="admin-hint">
              {uploading
                ? "در حال بارگذاری تصویر…"
                : "فقط تغییرات همین بخش ذخیره می‌شود."}
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.outline}
                disabled={busy}
                onClick={() => {
                  if (canLeave()) router.push("/admin/content?section=about");
                }}
              >
                انصراف
              </button>
              <button
                type="submit"
                className={styles.primary}
                disabled={busy || (!create && !dirty)}
              >
                <Save size={18} />
                {pending ? "در حال ذخیره…" : "ذخیره این بخش"}
              </button>
            </div>
          </footer>
        </fieldset>
      </form>
    </div>
  );
}
