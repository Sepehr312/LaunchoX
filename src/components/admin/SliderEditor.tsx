"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  GripVertical,
  Images,
  Info,
  Layers,
  Monitor,
  Plus,
  Save,
  Smartphone,
  Trash2,
} from "lucide-react";
import { saveContentAction } from "@/actions/admin/content.actions";
import {
  FormField,
  FormTextarea,
  ImagePreview,
} from "@/components/admin/AdminForm";
import { toPersianDigits } from "@/lib/format";
import { assetUrlSchema } from "@/validations/common";
import { contentSchema, type ContentInput } from "@/validations/content";
import styles from "@/components/admin/SliderEditor.module.css";

type SlidesContent = Extract<ContentInput, { key: "slides" }>;
type Slide = SlidesContent["data"][number];

function SlideImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState<string>();
  return assetUrlSchema.safeParse(src).success && failed !== src ? (
    <Image
      src={src}
      alt={alt}
      width={720}
      height={420}
      unoptimized
      className={className}
      onError={() => setFailed(src)}
    />
  ) : (
    <span className={styles.imageFallback}>
      <Images size={28} aria-hidden="true" />
      <span>تصویر در دسترس نیست</span>
    </span>
  );
}

export function SliderEditor({ initial }: { initial: SlidesContent }) {
  const [slides, setSlides] = useState(initial.data);
  const [saved, setSaved] = useState(initial.data);
  const [selectedId, setSelectedId] = useState(initial.data[0]?.id);
  const [mobile, setMobile] = useState(false);
  const [draggedId, setDraggedId] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();
  const selected = slides.find((slide) => slide.id === selectedId);
  const selectedIndex = slides.findIndex((slide) => slide.id === selectedId);
  const busy = pending || uploading;
  const dirty = JSON.stringify(slides) !== JSON.stringify(saved);

  function update(patch: Partial<Slide>) {
    setNotice(undefined);
    setSlides((current) =>
      current.map((slide) =>
        slide.id === selectedId ? { ...slide, ...patch } : slide,
      ),
    );
  }

  function move(id: string, target: number) {
    if (busy || target < 0 || target >= slides.length) return;
    setSlides((current) => {
      const next = [...current];
      const index = next.findIndex((slide) => slide.id === id);
      if (index < 0) return current;
      const [slide] = next.splice(index, 1);
      next.splice(target, 0, slide);
      return next;
    });
    setNotice(undefined);
  }

  function add() {
    if (busy || slides.length >= 20) return;
    const slide: Slide = {
      id: crypto.randomUUID(),
      dayImage: "/images/arctic-showroom-light.webp",
      eyebrow: "انتخابی برای زندگی بهتر",
      title: "اسلاید جدید",
      subtitle: "بهترین لوازم خانگی، در یک نگاه",
      description: "انتخابی مطمئن برای خانه شما",
      primary: { label: "مشاهده محصولات", href: "/products" },
      secondary: { label: "خدمات و پشتیبانی", href: "/services" },
      isActive: true,
    };
    setSlides((current) => [...current, slide]);
    setSelectedId(slide.id);
    setNotice(undefined);
  }

  return (
    <form
      className={styles.editor}
      aria-busy={busy}
      onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        setNotice(undefined);
        const parsed = contentSchema.safeParse({ key: "slides", data: slides });
        if (!parsed.success) {
          const issue = parsed.error.issues[0];
          const index = issue?.path[1];
          if (typeof index === "number" && slides[index])
            setSelectedId(slides[index].id);
          setNotice({
            ok: false,
            text: issue?.message ?? "اطلاعات اسلاید معتبر نیست.",
          });
          return;
        }
        if (parsed.data.key !== "slides") return;
        const payload = parsed.data;
        startTransition(async () => {
          try {
            const result = await saveContentAction(payload);
            if (result.ok) {
              setSaved(payload.data);
              setSlides(payload.data);
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
      <fieldset disabled={busy} className={styles.controls}>
        <section
          className={`admin-panel ${styles.slideList}`}
          aria-labelledby="slider-list-title"
        >
          <div className={styles.heading}>
            <div>
              <h2 id="slider-list-title">اسلایدهای صفحه اصلی</h2>
              <p className="admin-hint">ترتیب نمایش اسلایدها را مدیریت کنید.</p>
            </div>
            <button
              type="button"
              className={styles.outline}
              onClick={add}
              disabled={slides.length >= 20}
            >
              <Plus size={18} aria-hidden="true" />
              افزودن اسلاید
            </button>
          </div>
          {slides.length >= 20 && (
            <p className="admin-hint">
              حداکثر {toPersianDigits(20)} اسلاید می‌توانید داشته باشید.
            </p>
          )}
          {slides.length === 0 ? (
            <div className={styles.empty}>
              <Images size={36} aria-hidden="true" />
              <h3>هنوز اسلایدی اضافه نشده است.</h3>
              <p>با افزودن اسلاید، بنر صفحه اصلی فروشگاه را بسازید.</p>
            </div>
          ) : (
            <ol className={styles.slideGrid} aria-label="ترتیب اسلایدها">
              {slides.map((slide, index) => (
                <li
                  key={slide.id}
                  className={`${styles.slideCard} ${slide.id === selectedId ? styles.selected : ""}`}
                  onDragOver={(event) => {
                    if (!busy) event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedId) move(draggedId, index);
                    setDraggedId(undefined);
                  }}
                >
                  <button
                    type="button"
                    className={styles.selectSlide}
                    aria-pressed={slide.id === selectedId}
                    aria-label={`ویرایش اسلاید ${toPersianDigits(index + 1)}: ${slide.title}`}
                    onClick={() => setSelectedId(slide.id)}
                  >
                    <span className={styles.slideCopy}>
                      <small>اسلاید {toPersianDigits(index + 1)}</small>
                      <strong>{slide.title}</strong>
                      <span
                        className={`admin-badge ${slide.isActive ? "admin-badge-success" : ""}`}
                      >
                        {slide.isActive ? "فعال" : "غیرفعال"}
                      </span>
                    </span>
                    <SlideImage
                      src={slide.dayImage}
                      alt=""
                      className={styles.thumbnail}
                    />
                  </button>
                  <div className={styles.reorder}>
                    <span
                      draggable={!busy}
                      onDragStart={(event) => {
                        setDraggedId(slide.id);
                        event.dataTransfer.setData("text/plain", slide.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDraggedId(undefined)}
                      className={styles.grip}
                      title="برای جابه‌جایی بکشید"
                    >
                      <GripVertical size={18} aria-hidden="true" />
                    </span>
                    <button
                      type="button"
                      disabled={index === 0}
                      aria-label={`انتقال اسلاید ${toPersianDigits(index + 1)} به بالا`}
                      onClick={() => move(slide.id, index - 1)}
                    >
                      <ArrowUp size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      disabled={index === slides.length - 1}
                      aria-label={`انتقال اسلاید ${toPersianDigits(index + 1)} به پایین`}
                      onClick={() => move(slide.id, index + 1)}
                    >
                      <ArrowDown size={15} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {selected && (
          <div className={styles.workspace}>
            <section
              className={`admin-panel ${styles.editPanel}`}
              aria-labelledby="slide-edit-title"
            >
              <div className={styles.heading}>
                <h2 id="slide-edit-title">
                  ویرایش اسلاید{" "}
                  <span className="admin-badge">
                    اسلاید {toPersianDigits(selectedIndex + 1)}
                  </span>
                </h2>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label="نمایش اسلاید در فروشگاه"
                    checked={selected.isActive}
                    onChange={(event) =>
                      update({ isActive: event.target.checked })
                    }
                  />
                  <span>{selected.isActive ? "فعال" : "غیرفعال"}</span>
                </label>
              </div>
              <div className={styles.fields}>
                <FormField
                  label="عنوان کوتاه"
                  value={selected.eyebrow}
                  maxLength={5000}
                  onChange={(event) => update({ eyebrow: event.target.value })}
                />
                <FormField
                  label="عنوان اصلی"
                  value={selected.title}
                  maxLength={5000}
                  onChange={(event) => update({ title: event.target.value })}
                />
                <FormField
                  label="زیرعنوان"
                  value={selected.subtitle}
                  maxLength={5000}
                  onChange={(event) => update({ subtitle: event.target.value })}
                />
                <FormTextarea
                  label="توضیحات"
                  value={selected.description}
                  maxLength={5000}
                  onChange={(event) =>
                    update({ description: event.target.value })
                  }
                />
                <div className={styles.imageRow}>
                  <FormField
                    label="نشانی تصویر"
                    value={selected.dayImage}
                    dir="ltr"
                    maxLength={2000}
                    onChange={(event) =>
                      update({ dayImage: event.target.value })
                    }
                    hint="نشانی تصویر را وارد کنید یا از کادر کنار آن تصویر بارگذاری کنید."
                  />
                  <ImagePreview
                    key={selected.id}
                    src={selected.dayImage}
                    alt="تصویر اسلاید"
                    onUpload={(dayImage) => update({ dayImage })}
                    onUploadingChange={setUploading}
                  />
                </div>
              </div>
              <div className={styles.buttonSettings}>
                <h3>
                  <Layers size={19} aria-hidden="true" />
                  دکمه‌های اسلاید
                </h3>
                <div className={styles.buttonGrid}>
                  {(["primary", "secondary"] as const).map((key, index) => (
                    <fieldset key={key} className={styles.buttonGroup}>
                      <legend>{index === 0 ? "دکمه اصلی" : "دکمه دوم"}</legend>
                      <FormField
                        label={index === 0 ? "متن دکمه اصلی" : "متن دکمه دوم"}
                        value={selected[key].label}
                        maxLength={5000}
                        onChange={(event) =>
                          update({
                            [key]: {
                              ...selected[key],
                              label: event.target.value,
                            },
                          })
                        }
                      />
                      <FormField
                        label={
                          index === 0
                            ? "لینک داخلی دکمه اصلی"
                            : "لینک داخلی دکمه دوم"
                        }
                        value={selected[key].href}
                        dir="ltr"
                        maxLength={500}
                        onChange={(event) =>
                          update({
                            [key]: {
                              ...selected[key],
                              href: event.target.value,
                            },
                          })
                        }
                      />
                    </fieldset>
                  ))}
                </div>
              </div>
            </section>
            <aside className={styles.previewColumn}>
              <section
                className={`admin-panel ${styles.previewPanel}`}
                aria-labelledby="slide-preview-title"
              >
                <div className={styles.heading}>
                  <h2 id="slide-preview-title">
                    <Eye size={20} aria-hidden="true" />
                    پیش‌نمایش اسلاید
                  </h2>
                  <div
                    className={styles.devices}
                    role="group"
                    aria-label="اندازه پیش‌نمایش"
                  >
                    <button
                      type="button"
                      aria-label="پیش‌نمایش دسکتاپ"
                      aria-pressed={!mobile}
                      onClick={() => setMobile(false)}
                    >
                      <Monitor size={18} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="پیش‌نمایش موبایل"
                      aria-pressed={mobile}
                      onClick={() => setMobile(true)}
                    >
                      <Smartphone size={18} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div
                  className={`${styles.preview} ${mobile ? styles.mobilePreview : ""}`}
                >
                  <SlideImage
                    src={selected.dayImage}
                    alt="پیش‌نمایش تصویر بنر"
                    className={styles.heroImage}
                  />
                  <div className={styles.heroCopy}>
                    <small>{selected.eyebrow}</small>
                    <h3>{selected.title}</h3>
                    <p>{selected.subtitle}</p>
                    <p>{selected.description}</p>
                    <div className={styles.heroActions}>
                      <span>{selected.primary.label}</span>
                      <span>{selected.secondary.label}</span>
                    </div>
                  </div>
                  {!selected.isActive && (
                    <span className={styles.inactive}>
                      این اسلاید در فروشگاه نمایش داده نمی‌شود.
                    </span>
                  )}
                </div>
                <div className={styles.dots} aria-hidden="true">
                  {slides.map((slide) => (
                    <span
                      key={slide.id}
                      className={
                        slide.id === selectedId ? styles.activeDot : undefined
                      }
                    />
                  ))}
                </div>
                <p className={styles.caption}>نمایش تقریبی در صفحه اصلی</p>
              </section>
              <div className={styles.tip}>
                <Info size={20} aria-hidden="true" />
                <div>
                  <p>
                    برای تغییر ترتیب، اسلایدها را بکشید یا از دکمه‌های جابه‌جایی
                    استفاده کنید.
                  </p>
                  <p>اسلایدهای غیرفعال در فروشگاه نمایش داده نمی‌شوند.</p>
                </div>
              </div>
              <button
                type="button"
                className={styles.danger}
                onClick={() => {
                  if (
                    !window.confirm(
                      `اسلاید «${selected.title}» حذف شود؟ حذف پس از ذخیره تغییرات اعمال می‌شود.`,
                    )
                  )
                    return;
                  const next = slides.filter(
                    (slide) => slide.id !== selectedId,
                  );
                  setSlides(next);
                  setSelectedId(
                    next[Math.min(selectedIndex, next.length - 1)]?.id,
                  );
                  setNotice(undefined);
                }}
              >
                <Trash2 size={17} aria-hidden="true" />
                حذف این اسلاید
              </button>
            </aside>
          </div>
        )}
        <footer className={`admin-panel ${styles.footer}`}>
          <p className="admin-hint">
            {dirty
              ? "تغییرات ذخیره‌نشده دارید؛ پس از ذخیره در صفحه اصلی نمایش داده می‌شوند."
              : "تغییرات پس از ذخیره در صفحه اصلی نمایش داده می‌شوند."}
          </p>
          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.outline}
              disabled={!dirty}
              onClick={() => {
                if (!window.confirm("تغییرات ذخیره‌نشده کنار گذاشته شوند؟"))
                  return;
                setSlides(saved);
                setSelectedId(saved[0]?.id);
                setNotice(undefined);
              }}
            >
              انصراف
            </button>
            <button type="submit" className={styles.primary} disabled={!dirty}>
              <Save size={18} aria-hidden="true" />
              {pending
                ? "در حال ذخیره…"
                : uploading
                  ? "در حال بارگذاری…"
                  : "ذخیره تغییرات"}
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
