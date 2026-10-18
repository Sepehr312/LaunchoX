"use client";
import { Save } from "lucide-react";
import { useAdminFormAction } from "@/components/admin/use-admin-form-action";
import Link from "next/link";
import { useState } from "react";
import { brandAction } from "@/actions/admin/brand.actions";
import { toPersianDigits } from "@/lib/format";
import type { BrandDTO } from "@/types/dto";
import {
  FormSection,
  FormField,
  FormTextarea,
  FormToggle,
  FormFeedback,
  ImagePreview,
} from "@/components/admin/AdminForm";

export function BrandForm({ brand }: { brand?: BrandDTO }) {
  const [state, action, pending] = useAdminFormAction(
    brandAction,
    "/admin/brands",
    brand?.id,
  );
  const [uploading, setUploading] = useState(false);
  const [values, setValues] = useState({
    name: brand?.name ?? "",
    slug: brand?.slug ?? "",
    logo: brand?.logo ?? "",
    country: brand?.country ?? "",
    website: brand?.website ?? "",
    description: brand?.description ?? "",
    order: toPersianDigits(brand?.order ?? 0),
    isActive: brand?.isActive ?? true,
    isFeatured: brand?.isFeatured ?? false,
  });
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const field = (
    name:
      | "name"
      | "slug"
      | "logo"
      | "country"
      | "website"
      | "description"
      | "order",
  ) => ({
    name,
    value: values[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues({ ...values, [name]: e.target.value }),
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
        value={brand || state?.ok ? "edit" : "create"}
      />
      <input
        type="hidden"
        name="id"
        value={brand?.id ?? (state?.ok ? state.data.id : "")}
      />
      <FormFeedback state={state}>
        <Link href={`/admin/brands/${state?.ok ? state.data.id : ""}/edit`}>
          ویرایش برند
        </Link>{" "}
        · <Link href="/admin/brands">فهرست برندها</Link>
      </FormFeedback>
      <fieldset
        disabled={pending || uploading}
        className="admin-form-body admin-editor-layout"
      >
        <div className="admin-editor-media">
          <FormSection title="لوگو و ترتیب نمایش">
            <ImagePreview
              src={values.logo}
              alt={values.name || "لوگوی برند"}
              onUploadingChange={setUploading}
              onUpload={(logo) =>
                setValues((current) => ({ ...current, logo }))
              }
            />
            <FormField
              label="نشانی لوگو"
              dir="ltr"
              hint="نشانی اینترنتی یا مسیر تصویر موجود در سایت"
              {...field("logo")}
            />
            <FormField
              label="ترتیب نمایش"
              inputMode="numeric"
              required
              {...field("order")}
            />
          </FormSection>
        </div>
        <div className="admin-editor-main">
          <FormSection
            title="هویت برند"
            description="اطلاعات سازنده را یک‌بار ثبت و در فروشگاه مدیریت کنید."
          >
            <FormField label="نام برند" fullWidth required {...field("name")} />
            <FormField
              label="نامک"
              fullWidth
              hint="خالی بگذارید تا به‌صورت خودکار ساخته شود."
              {...field("slug")}
            />
            <FormField label="کشور" {...field("country")} />
            <FormField
              label="وب‌سایت"
              dir="ltr"
              type="url"
              placeholder="https://example.com"
              {...field("website")}
            />
            <FormTextarea label="توضیحات" {...field("description")} />
          </FormSection>
        </div>
        <aside className="admin-editor-aside" aria-label="تنظیمات نمایش">
          <FormSection title="وضعیت برند">
            <FormToggle
              label="برند فعال"
              description="نمایش در فروشگاه"
              name="isActive"
              checked={values.isActive}
              onChange={(e) =>
                setValues({ ...values, isActive: e.target.checked })
              }
            />
            <FormToggle
              label="برند ویژه"
              description="نمایش در برندهای منتخب"
              name="isFeatured"
              checked={values.isFeatured}
              onChange={(e) =>
                setValues({ ...values, isFeatured: e.target.checked })
              }
            />
          </FormSection>
        </aside>
        <div className="admin-form-footer">
          <button className="admin-primary" type="submit">
            <Save size={18} aria-hidden="true" />
            {pending ? "در حال ذخیره…" : "ذخیره برند"}
          </button>
          <Link href="/admin/brands">بازگشت به برندها</Link>
        </div>
      </fieldset>
    </form>
  );
}
