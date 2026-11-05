"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  FormField,
  FormSelect,
  FormTextarea,
  ImagePreview,
} from "@/components/admin/AdminForm";
import { ContentIcon } from "@/components/store/ContentIcon";
import type { AboutContact } from "@/components/store/AboutSections";
import { createSectionItem } from "@/components/admin/about-templates";
import { toPersianDigits } from "@/lib/format";
import {
  contentIconSchema,
  type AboutSection,
  type SectionItem,
} from "@/validations/about-sections";
import styles from "./AboutEditor.module.css";

export function EditorToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.toggle}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function ButtonFields({
  value,
  onChange,
  errors,
  prefix = "button",
  secondary = false,
}: {
  value: AboutSection["button"];
  onChange: (value: NonNullable<AboutSection["button"]>) => void;
  errors: Record<string, string[]>;
  prefix?: string;
  secondary?: boolean;
}) {
  const button = value ?? { enabled: false, label: "", href: "" };
  return (
    <div className={styles.group}>
      <h3>{secondary ? "تنظیمات دکمهٔ دوم" : "تنظیمات دکمه"}</h3>
      <EditorToggle
        label={secondary ? "نمایش دکمهٔ دوم" : "نمایش دکمه"}
        checked={button.enabled}
        onChange={(enabled) => onChange({ ...button, enabled })}
      />
      <FormField
        label={secondary ? "متن دکمهٔ دوم" : "متن دکمه"}
        maxLength={200}
        value={button.label}
        error={errors[`${prefix}.label`]}
        onChange={(event) => onChange({ ...button, label: event.target.value })}
      />
      <FormField
        label={secondary ? "لینک داخلی دکمهٔ دوم" : "لینک داخلی"}
        dir="ltr"
        value={button.href}
        maxLength={500}
        error={errors[`${prefix}.href`]}
        placeholder="/products"
        onChange={(event) => onChange({ ...button, href: event.target.value })}
      />
    </div>
  );
}

const iconLabels = {
  store: "فروشگاه",
  book: "کتاب",
  shield: "امنیت",
  layers: "تنوع",
  info: "اطلاعات",
  headphones: "پشتیبانی",
  compass: "راهنما",
  cart: "خرید",
  truck: "ارسال",
  leaf: "انرژی",
  compare: "مقایسه",
  check: "تأیید",
  ruler: "ابعاد",
  volume: "صدا",
  message: "مشاوره",
  package: "تحویل",
  wrench: "نصب",
};

function ItemFields({
  section,
  onChange,
  errors,
  services = false,
}: {
  services?: boolean;
  section: AboutSection;
  onChange: (patch: Partial<AboutSection>) => void;
  errors: Record<string, string[]>;
}) {
  const [selectedId, setSelectedId] = useState(section.items?.[0]?.id);
  const [dragged, setDragged] = useState<string>();
  const items = section.items ?? [];
  const invalidIndex = items.findIndex((_, index) =>
    Object.keys(errors).some((path) => path.startsWith(`items.${index}.`)),
  );
  const selected =
    items[invalidIndex] ??
    items.find((item) => item.id === selectedId) ??
    items[0];
  const index = selected ? items.indexOf(selected) : -1;
  const faq = section.template === "faq";
  const noun = faq
    ? "پرسش"
    : services
      ? section.template === "steps"
        ? "راهنما"
        : "خدمت"
      : section.template === "steps"
        ? "مرحله"
        : "ارزش";
  function update(patch: Partial<SectionItem>) {
    onChange({
      items: items.map((item) =>
        item.id === selected?.id ? { ...item, ...patch } : item,
      ),
    });
  }
  function move(id: string, target: number) {
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const from = next.findIndex((item) => item.id === id);
    if (from < 0) return;
    const [item] = next.splice(from, 1);
    next.splice(target, 0, item);
    onChange({ items: next });
  }
  return (
    <div className={styles.columns}>
      <div className={styles.group}>
        <h3>
          {faq
            ? "پرسش‌ها"
            : section.template === "steps"
              ? services
                ? "راهنماهای خدمات"
                : "مراحل انتخاب"
              : services
                ? "کارت‌های خدمات"
                : "کارت‌های ارزش"}
        </h3>
        <p className="admin-hint">
          با دکمه‌های بالا و پایین یا کشیدن ردیف‌ها، ترتیب را تغییر دهید.
        </p>
        <div className={styles.list}>
          {items.map((item, itemIndex) => (
            <div
              key={item.id}
              className={`${styles.row} ${item.id === selected?.id ? styles.selected : ""}`}
              draggable
              onDragStart={(event) => {
                event.stopPropagation();
                setDragged(item.id);
              }}
              onDragEnd={() => setDragged(undefined)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (dragged) move(dragged, itemIndex);
                setDragged(undefined);
              }}
            >
              <button
                type="button"
                className={styles.selectRow}
                aria-pressed={item.id === selected?.id}
                onClick={() => setSelectedId(item.id)}
              >
                {toPersianDigits(itemIndex + 1)}. {item.title}
              </button>
              <EditorToggle
                label={`نمایش ${noun} ${toPersianDigits(itemIndex + 1)}`}
                checked={item.isActive}
                onChange={(isActive) =>
                  onChange({
                    items: items.map((current) =>
                      current.id === item.id
                        ? { ...current, isActive }
                        : current,
                    ),
                  })
                }
              />
              <div className={styles.rowActions}>
                <button
                  type="button"
                  aria-label={`انتقال ${noun} ${toPersianDigits(itemIndex + 1)} به بالا`}
                  disabled={itemIndex === 0}
                  onClick={() => move(item.id, itemIndex - 1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  aria-label={`انتقال ${noun} ${toPersianDigits(itemIndex + 1)} به پایین`}
                  disabled={itemIndex === items.length - 1}
                  onClick={() => move(item.id, itemIndex + 1)}
                >
                  <ArrowDown size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {errors.items && (
          <p className="admin-field-error">{errors.items.join("، ")}</p>
        )}
        <button
          type="button"
          className={styles.outline}
          disabled={items.length >= 30}
          onClick={() => {
            if (!section.template) return;
            const item = createSectionItem(section.template);
            onChange({ items: [...items, item] });
            setSelectedId(item.id);
          }}
        >
          <Plus size={18} />
          افزودن {noun}
        </button>
        {faq && (
          <EditorToggle
            label="باز بودن اولین پرسش"
            checked={section.openFirst ?? false}
            onChange={(openFirst) => onChange({ openFirst })}
          />
        )}
      </div>
      {selected ? (
        <div className={styles.group} key={selected.id}>
          <h3>
            ویرایش {noun}: {selected.title}
          </h3>
          {services && section.template === "values" && (
            <FormField
              label="برچسب کارت"
              value={selected.label ?? ""}
              maxLength={300}
              onChange={(event) => update({ label: event.target.value })}
            />
          )}
          <FormField
            label={faq ? "متن پرسش" : `عنوان ${noun}`}
            value={selected.title}
            maxLength={500}
            error={errors[`items.${index}.title`]}
            onChange={(event) => update({ title: event.target.value })}
          />
          <FormTextarea
            label={faq ? "پاسخ" : `توضیح ${noun}`}
            rows={5}
            maxLength={5000}
            value={selected.description}
            error={errors[`items.${index}.description`]}
            onChange={(event) => update({ description: event.target.value })}
          />
          {!faq && (
            <fieldset className={styles.iconPicker}>
              <legend>انتخاب آیکون</legend>
              {contentIconSchema.options.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={selected.icon === name}
                  className={selected.icon === name ? styles.selected : ""}
                  onClick={() => update({ icon: name })}
                >
                  <ContentIcon name={name} size={24} />
                  <span>{iconLabels[name]}</span>
                </button>
              ))}
            </fieldset>
          )}
          {(section.template === "steps" ||
            (services && section.template === "values")) && (
            <ButtonFields
              value={selected.button}
              onChange={(button) => update({ button })}
              errors={errors}
              prefix={`items.${index}.button`}
            />
          )}
          <button
            type="button"
            className={styles.danger}
            onClick={() => {
              if (window.confirm(`آیا ${noun} «${selected.title}» حذف شود؟`))
                onChange({
                  items: items.filter((item) => item.id !== selected.id),
                });
            }}
          >
            <Trash2 size={16} />
            حذف {noun}
          </button>
        </div>
      ) : (
        <p className={styles.empty}>هنوز موردی اضافه نشده است.</p>
      )}
    </div>
  );
}

export function AboutSectionFields({
  section,
  onChange,
  contact,
  onUploadingChange,
  errors,
  services = false,
}: {
  services?: boolean;
  section: AboutSection;
  onChange: (patch: Partial<AboutSection>) => void;
  contact: AboutContact;
  onUploadingChange: (uploading: boolean) => void;
  errors: Record<string, string[]>;
}) {
  const imageSection =
    !section.template ||
    section.template === "introduction" ||
    section.template === "story";
  const settings = section.contact;
  return (
    <div className={styles.fields}>
      <div className={imageSection ? styles.columns : styles.fields}>
        <div className={styles.group}>
          <FormField
            label={
              section.template === "introduction" ? "عنوان اصلی" : "عنوان بخش"
            }
            value={section.title}
            maxLength={5000}
            error={errors.title}
            onChange={(event) => onChange({ title: event.target.value })}
          />
          {
            <FormField
              label={
                section.template === "story" && !services
                  ? "زیرعنوان"
                  : "عنوان کوتاه"
              }
              value={section.eyebrow ?? ""}
              maxLength={5000}
              onChange={(event) => onChange({ eyebrow: event.target.value })}
            />
          }
          {section.template === "introduction" && (
            <FormField
              label="بخش آبی عنوان"
              value={section.titleAccent ?? ""}
              maxLength={500}
              error={errors.titleAccent}
              onChange={(event) =>
                onChange({ titleAccent: event.target.value })
              }
            />
          )}
          <FormTextarea
            label={
              imageSection
                ? section.template === "story"
                  ? services
                    ? "متن پیگیری سفارش"
                    : "متن داستان"
                  : "متن معرفی"
                : section.template === "contact"
                  ? "متن دعوت به ارتباط"
                  : "توضیح بخش"
            }
            value={section.description}
            rows={5}
            maxLength={5000}
            error={errors.description}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        </div>
        {imageSection && (
          <div className={styles.group}>
            <h3>
              {section.template === "story"
                ? services
                  ? "تصویر بخش"
                  : "تصویر داستان"
                : "تصویر معرفی"}
            </h3>
            <ImagePreview
              src={section.imageUrl}
              alt={section.imageAlt || "تصویر بخش"}
              onUpload={(imageUrl) => onChange({ imageUrl })}
              onUploadingChange={onUploadingChange}
            />
            <FormField
              label="نشانی تصویر"
              dir="ltr"
              value={section.imageUrl}
              error={errors.imageUrl}
              onChange={(event) => onChange({ imageUrl: event.target.value })}
            />
            <FormField
              label="متن جایگزین تصویر"
              maxLength={300}
              value={section.imageAlt ?? ""}
              error={errors.imageAlt}
              onChange={(event) => onChange({ imageAlt: event.target.value })}
            />
            <FormSelect
              label="چیدمان"
              value={section.imagePosition ?? "end"}
              onChange={(event) =>
                onChange({
                  imagePosition:
                    event.target.value === "start" ? "start" : "end",
                })
              }
            >
              <option value="start">تصویر در ابتدا</option>
              <option value="end">تصویر در انتها</option>
            </FormSelect>
          </div>
        )}
      </div>
      {section.template === "introduction" && (
        <div className={styles.group}>
          <FormField
            label="یادداشت زیر دکمه‌ها"
            value={section.note ?? ""}
            maxLength={5000}
            error={errors.note}
            onChange={(event) => onChange({ note: event.target.value })}
          />
          <FormField
            label="عنوان کارت کنار تصویر"
            value={section.captionTitle ?? ""}
            maxLength={300}
            error={errors.captionTitle}
            onChange={(event) => onChange({ captionTitle: event.target.value })}
          />
          <FormField
            label="توضیح کارت کنار تصویر"
            value={section.captionDescription ?? ""}
            maxLength={300}
            error={errors.captionDescription}
            onChange={(event) =>
              onChange({ captionDescription: event.target.value })
            }
          />
        </div>
      )}
      {section.template === "steps" && (
        <div className={styles.group}>
          <FormField
            label="عنوان کادر راهنما"
            value={section.panelTitle ?? ""}
            maxLength={500}
            error={errors.panelTitle}
            onChange={(event) => onChange({ panelTitle: event.target.value })}
          />
          <FormField
            label="یادداشت کادر راهنما"
            value={section.panelNote ?? ""}
            maxLength={5000}
            error={errors.panelNote}
            onChange={(event) => onChange({ panelNote: event.target.value })}
          />
          <ButtonFields
            value={section.button}
            onChange={(button) => onChange({ button })}
            errors={errors}
          />
        </div>
      )}
      {(section.template === "introduction" ||
        section.template === "contact" ||
        (services && section.template === "story")) && (
        <ButtonFields
          secondary
          value={section.secondaryButton}
          prefix="secondaryButton"
          onChange={(secondaryButton) => onChange({ secondaryButton })}
          errors={errors}
        />
      )}
      {(section.template === "introduction" ||
        section.template === "story") && (
        <ButtonFields
          value={section.button}
          onChange={(button) => onChange({ button })}
          errors={errors}
        />
      )}
      {(section.template === "values" ||
        section.template === "steps" ||
        section.template === "faq") && (
        <ItemFields
          key={section.id}
          services={services}
          section={section}
          onChange={onChange}
          errors={errors}
        />
      )}
      {section.template === "contact" && settings && (
        <div className={styles.columns}>
          <div className={styles.group}>
            <h3>اطلاعات تماس</h3>
            <EditorToggle
              label="استفاده از اطلاعات تماس فروشگاه"
              checked={settings.useStore}
              onChange={(useStore) =>
                onChange({ contact: { ...settings, useStore } })
              }
            />
            {settings.useStore && (
              <>
                <p className="admin-hint">
                  تلفن، ایمیل و نشانی از بخش اطلاعات تماس خوانده می‌شوند.
                </p>
                <Link
                  className={styles.outline}
                  href="/admin/content?section=contact"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ویرایش اطلاعات تماس
                </Link>
              </>
            )}
            {(["phone", "email", "address"] as const).map((key) => (
              <FormField
                key={key}
                label={{ phone: "تلفن", email: "ایمیل", address: "نشانی" }[key]}
                dir={key === "address" ? "rtl" : "ltr"}
                readOnly={settings.useStore}
                placeholder="ثبت نشده"
                value={settings.useStore ? contact[key] : settings[key]}
                error={errors[`contact.${key}`]}
                maxLength={
                  key === "address" ? 1000 : key === "phone" ? 40 : 254
                }
                onChange={(event) =>
                  onChange({
                    contact: { ...settings, [key]: event.target.value },
                  })
                }
              />
            ))}
            <EditorToggle
              label="نمایش تلفن"
              checked={settings.showPhone}
              onChange={(showPhone) =>
                onChange({ contact: { ...settings, showPhone } })
              }
            />
            <EditorToggle
              label="نمایش ایمیل"
              checked={settings.showEmail}
              onChange={(showEmail) =>
                onChange({ contact: { ...settings, showEmail } })
              }
            />
            <EditorToggle
              label="نمایش نشانی"
              checked={settings.showAddress}
              onChange={(showAddress) =>
                onChange({ contact: { ...settings, showAddress } })
              }
            />
          </div>
          <ButtonFields
            value={section.button}
            onChange={(button) => onChange({ button })}
            errors={errors}
          />
        </div>
      )}
    </div>
  );
}
