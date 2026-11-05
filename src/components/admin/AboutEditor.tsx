"use client";

import Link from "next/link";
import { ServicesSections } from "@/components/store/ServicesSections";
import {
  servicesTemplates,
  prepareServicesPage,
} from "@/lib/services-defaults";
import { mutateServicesSectionAction } from "@/actions/admin/content.actions";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  GripVertical,
  Monitor,
  Pencil,
  Plus,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { mutateAboutSectionAction } from "@/actions/admin/content.actions";
import { EditorToggle } from "@/components/admin/AboutSectionFields";
import { TemplatePreview } from "@/components/admin/AboutTemplatePreview";
import {
  aboutTemplates,
  prepareAboutPage,
} from "@/components/admin/about-templates";
import {
  AboutSections,
  type AboutContact,
} from "@/components/store/AboutSections";
import { toPersianDigits } from "@/lib/format";
import { applyAboutMutation } from "@/lib/about-mutation";
import type { ContentInput } from "@/validations/content";
import type {
  AboutMutation,
  SectionTemplate,
} from "@/validations/about-sections";
import styles from "./AboutEditor.module.css";

type AboutContent = Extract<ContentInput, { key: "about" | "services" }>;

export function AboutEditor({
  initial,
  contact,
}: {
  initial: AboutContent;
  contact: AboutContact;
}) {
  const services = initial.key === "services";
  const pageLabel = services ? "خدمات" : "درباره ما";
  const templates = services ? servicesTemplates : aboutTemplates;
  const prepare = services ? prepareServicesPage : prepareAboutPage;
  const mutateAction = services
    ? mutateServicesSectionAction
    : mutateAboutSectionAction;
  const Sections = services ? ServicesSections : AboutSections;
  const [value, setValue] = useState(() => prepare(initial.data));
  const [previousInitial, setPreviousInitial] = useState(initial);
  const [picker, setPicker] = useState(false);
  const [template, setTemplate] = useState<SectionTemplate>("introduction");
  const [mobile, setMobile] = useState(false);
  const [dragged, setDragged] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string }>();
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const router = useRouter();

  if (previousInitial !== initial) {
    setPreviousInitial(initial);
    setValue(prepare(initial.data));
  }

  useEffect(() => {
    if (picker && !dialog.current?.open) dialog.current?.showModal();
    else if (!picker && dialog.current?.open) dialog.current.close();
  }, [picker]);

  function mutate(input: AboutMutation) {
    if (lock.current) return;
    lock.current = true;
    const previous = value;
    setValue(prepare(applyAboutMutation(value, input)));
    setNotice(undefined);
    startTransition(async () => {
      try {
        const result = await mutateAction(input);
        if (result.ok) setValue(result.data);
        else setValue(previous);
        setNotice({
          ok: result.ok,
          text: result.ok ? "تغییر ذخیره شد." : result.error,
        });
      } catch {
        setValue(previous);
        setNotice({
          ok: false,
          text: "ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.",
        });
      } finally {
        lock.current = false;
      }
    });
  }

  function move(id: string, target: number) {
    const targetId = value.sections[target]?.id;
    if (targetId) mutate({ operation: "move", id, targetId });
  }

  return (
    <div className={styles.editor} aria-busy={pending}>
      {notice && (
        <div
          role={notice.ok ? "status" : "alert"}
          className={notice.ok ? "admin-success" : "admin-error"}
        >
          {notice.text}
        </div>
      )}
      <fieldset className={styles.controls} disabled={pending}>
        <section
          className={`admin-panel ${styles.previewPanel}`}
          aria-labelledby="about-preview-title"
        >
          <header className={styles.heading}>
            <h2 id="about-preview-title">
              <Eye size={21} />
              پیش‌نمایش کل صفحه {pageLabel}
            </h2>
            <div className={styles.devices}>
              <button
                type="button"
                aria-label="پیش‌نمایش دسکتاپ"
                aria-pressed={!mobile}
                onClick={() => setMobile(false)}
              >
                <Monitor size={20} />
              </button>
              <button
                type="button"
                aria-label="پیش‌نمایش موبایل"
                aria-pressed={mobile}
                onClick={() => setMobile(true)}
              >
                <Smartphone size={20} />
              </button>
            </div>
            <EditorToggle
              label={`نمایش صفحه ${pageLabel}`}
              checked={value.isActive}
              onChange={(isActive) =>
                mutate({ operation: "page-visibility", isActive })
              }
            />
          </header>
          <p className="admin-hint">
            برای ویرایش، روی بخش موردنظر بزنید. تغییر ترتیب و وضعیت نمایش
            به‌صورت مستقل ذخیره می‌شود.
          </p>
          <div
            className={`${styles.preview} ${mobile ? styles.mobilePreview : ""}`}
          >
            {value.sections.map((section, index) => {
              const href = `/admin/content/${initial.key}/${encodeURIComponent(section.id)}/edit`;
              const label =
                templates.find((item) => item.type === section.template)
                  ?.title ?? section.title;
              return (
                <div
                  key={section.id}
                  className={`${styles.previewSection} ${section.isActive === false ? styles.disabledSection : ""}`}
                  onDragOver={(event) => {
                    if (dragged) event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragged) move(dragged, index);
                    setDragged(undefined);
                  }}
                >
                  <div className={styles.sectionToolbar}>
                    <button
                      type="button"
                      draggable={!pending}
                      className={styles.dragHandle}
                      aria-label={`جابجایی ${label}`}
                      onDragStart={() => setDragged(section.id)}
                      onDragEnd={() => setDragged(undefined)}
                    >
                      <GripVertical size={18} />
                    </button>
                    <Link
                      href={href}
                      className={styles.sectionEditLink}
                      aria-disabled={pending}
                      onClick={(event) => {
                        if (pending) event.preventDefault();
                      }}
                    >
                      <Pencil size={16} />
                      {label}
                    </Link>
                    {section.isActive === false && (
                      <span className="admin-hint">پنهان در فروشگاه</span>
                    )}
                    <EditorToggle
                      label={`نمایش بخش ${toPersianDigits(index + 1)}`}
                      checked={section.isActive !== false}
                      onChange={(isActive) =>
                        mutate({
                          operation: "visibility",
                          id: section.id,
                          isActive,
                        })
                      }
                    />
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        aria-label={`انتقال بخش ${toPersianDigits(index + 1)} به بالا`}
                        disabled={index === 0}
                        onClick={() => move(section.id, index - 1)}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label={`انتقال بخش ${toPersianDigits(index + 1)} به پایین`}
                        disabled={index === value.sections.length - 1}
                        onClick={() => move(section.id, index + 1)}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label={`حذف بخش ${label}`}
                        onClick={() => {
                          if (
                            window.confirm(
                              `آیا بخش «${section.title}» حذف شود؟`,
                            )
                          )
                            mutate({ operation: "delete", id: section.id });
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <Link
                    href={href}
                    className={styles.sectionCanvas}
                    aria-label={`ویرایش بخش ${label}`}
                    aria-disabled={pending}
                    onClick={(event) => {
                      if (pending) event.preventDefault();
                    }}
                  >
                    <div inert>
                      <Sections
                        sections={[section]}
                        contact={contact}
                        preview
                      />
                    </div>
                  </Link>
                </div>
              );
            })}
            <button
              type="button"
              className={styles.addSection}
              disabled={value.sections.length >= 30}
              aria-label="افزودن بخش"
              onClick={() => setPicker(true)}
            >
              <Plus size={32} />
              <span>افزودن بخش</span>
            </button>
          </div>
          <p className="admin-hint">
            {toPersianDigits(value.sections.length)} از {toPersianDigits(30)}{" "}
            بخش
          </p>
        </section>
      </fieldset>
      <dialog
        className={styles.dialog}
        ref={dialog}
        onClose={() => setPicker(false)}
        aria-labelledby="template-picker-title"
      >
        <header className={styles.heading}>
          <div>
            <h2 id="template-picker-title">افزودن بخش آماده</h2>
            <p className="admin-hint">
              قالب را انتخاب کنید و در صفحهٔ ویرایش ذخیره کنید.
            </p>
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label="بستن انتخاب قالب"
            onClick={() => setPicker(false)}
          >
            <X />
          </button>
        </header>
        <div className={styles.templates}>
          {templates.map((item) => (
            <button
              type="button"
              key={item.type}
              className={`${styles.template} ${template === item.type ? styles.selected : ""}`}
              aria-pressed={template === item.type}
              onClick={() => setTemplate(item.type)}
            >
              <TemplatePreview type={item.type} />
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>
        <footer className={styles.heading}>
          <p>
            قالب انتخاب‌شده:{" "}
            {templates.find((item) => item.type === template)?.title}
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.outline}
              onClick={() => setPicker(false)}
            >
              انصراف
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={pending || value.sections.length >= 30}
              onClick={() => {
                setPicker(false);
                router.push(
                  `/admin/content/${initial.key}/new?template=${template}`,
                );
              }}
            >
              ادامه و ویرایش بخش
            </button>
          </div>
        </footer>
      </dialog>
    </div>
  );
}
