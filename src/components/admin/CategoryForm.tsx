"use client";
import { Save } from "lucide-react";
import { useAdminFormAction } from "@/components/admin/use-admin-form-action";
import Link from "next/link";
import { useState } from "react";
import { categoryAction } from "@/actions/admin/category.actions";
import { toPersianDigits } from "@/lib/format";
import type { CategoryDTO } from "@/types/dto";
import {
  FormSection,
  FormField,
  FormSelect,
  FormTextarea,
  FormToggle,
  FormFeedback,
  ImagePreview,
} from "@/components/admin/AdminForm";

export function CategoryForm({
  category,
  categories,
}: {
  category?: CategoryDTO;
  categories: CategoryDTO[];
}) {
  const [state, action, pending] = useAdminFormAction(
    categoryAction,
    "/admin/categories",
    category?.id,
  );
  const [uploading, setUploading] = useState(false);
  const [values, setValues] = useState({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    image: category?.image ?? "",
    order: toPersianDigits(category?.order ?? 0),
    parent: category?.parent ?? "",
    description: category?.description ?? "",
    isActive: category?.isActive ?? true,
  });
  const hasChildren =
    !!category && categories.some((item) => item.parent === category.id);
  const parents = categories.filter(
    (item) => !item.parent && item.id !== category?.id && !hasChildren,
  );
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const field = (
    name: "name" | "slug" | "image" | "order" | "parent" | "description",
  ) => ({
    name,
    value: values[name],
    onChange: (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => setValues({ ...values, [name]: event.target.value }),
    error: errors?.[name],
  });
  return (
    <form
      action={action}
      className="admin-product-form"
      aria-busy={pending || uploading}
    >
      <input
        type="hidden"
        name="operation"
        value={category || state?.ok ? "edit" : "create"}
      />
      <input
        type="hidden"
        name="id"
        value={category?.id ?? (state?.ok ? state.data.id : "")}
      />
      <FormFeedback state={state}>
        <Link href={`/admin/categories/${state?.ok ? state.data.id : ""}/edit`}>
          ویرایش دسته‌بندی
        </Link>
      </FormFeedback>
      <fieldset
        disabled={pending || uploading}
        className="admin-form-body admin-editor-layout"
      >
        <div className="admin-editor-main">
          <FormSection
            title="اطلاعات دسته‌بندی"
            description="محصولات فروشگاه را در دسته‌های روشن و قابل‌فهم مرتب کنید."
          >
            <FormField
              label="نام دسته‌بندی"
              fullWidth
              required
              {...field("name")}
            />
            <FormField
              label="نامک"
              fullWidth
              hint="خالی بگذارید تا از نام ساخته شود."
              {...field("slug")}
            />
            <FormSelect label="دستهٔ والد" {...field("parent")}>
              <option value="">بدون والد</option>
              {parents.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                  {!item.isActive && " (غیرفعال)"}
                </option>
              ))}
            </FormSelect>
            <FormField
              label="ترتیب نمایش"
              inputMode="numeric"
              required
              {...field("order")}
            />
            {hasChildren && (
              <p className="admin-hint admin-span">
                این دسته زیردسته دارد و نمی‌تواند والد داشته باشد.
              </p>
            )}
            <FormTextarea label="توضیحات" {...field("description")} />
          </FormSection>
        </div>
        <aside className="admin-editor-aside" aria-label="تنظیمات نمایش">
          <FormSection title="تصویر دسته‌بندی">
            <ImagePreview
              onUploadingChange={setUploading}
              onUpload={(image) =>
                setValues((current) => ({ ...current, image }))
              }
              src={values.image}
              alt={values.name || "تصویر دسته‌بندی"}
            />
            <FormField
              label="نشانی تصویر"
              dir="ltr"
              hint="نشانی اینترنتی یا مسیر تصویر موجود در سایت"
              {...field("image")}
            />
          </FormSection>
          <FormSection title="انتشار دسته‌بندی">
            <FormToggle
              label="دسته‌بندی فعال"
              description="قابل نمایش در فروشگاه"
              name="isActive"
              checked={values.isActive}
              onChange={(e) =>
                setValues({ ...values, isActive: e.target.checked })
              }
            />
          </FormSection>
        </aside>
        <div className="admin-form-footer">
          <button className="admin-primary" type="submit">
            <Save size={18} aria-hidden="true" />
            {pending ? "در حال ذخیره…" : "ذخیره دسته‌بندی"}
          </button>
          <Link href="/admin/categories">بازگشت به دسته‌بندی‌ها</Link>
        </div>
      </fieldset>
    </form>
  );
}
