"use client";
import { isBrandAttribute } from "@/validations/brand-text";
import { Save } from "lucide-react";
import { useAdminFormAction } from "@/components/admin/use-admin-form-action";
import Link from "next/link";
import { useState } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import { productAction } from "@/actions/admin/product.actions";
import { formatDate, toPersianDigits } from "@/lib/format";
import type { StoreProductDTO } from "@/types/dto";
import {
  FormSection,
  FormField,
  FormSelect,
  FormTextarea,
  FormToggle,
  FormFeedback,
  ImagePreview,
} from "@/components/admin/AdminForm";

export function ProductForm({
  product,
  categories,
  brands = [],
  brandId,
}: {
  product?: StoreProductDTO;
  brandId?: string;
  categories: { id: string; name: string }[];
  brands?: { id: string; name: string; isActive: boolean }[];
}) {
  const [state, action, pending] = useAdminFormAction(
    productAction,
    "/admin/products",
    product?.id,
  );
  const [uploading, setUploading] = useState(false);
  const [values, setValues] = useState({
    title: product?.title ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    price: product ? toPersianDigits(product.price) : "",
    compareAtPrice:
      product?.compareAtPrice === undefined
        ? ""
        : toPersianDigits(product.compareAtPrice),
    stock: toPersianDigits(product?.stock ?? 0),
    sku: product?.sku ?? "",
    category: product?.category.id ?? "",
    brand: brandId ?? "",
    isActive: product?.isActive ?? true,
    isFeatured: product?.isFeatured ?? false,
  });
  const [images, setImages] = useState(
    product?.images.length ? product.images : [""],
  );
  const [attributes, setAttributes] = useState<
    { key: string; value: string }[]
  >(product?.attributes.filter((item) => !isBrandAttribute(item.key)) ?? []);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const field = (
    name:
      | "title"
      | "slug"
      | "description"
      | "price"
      | "compareAtPrice"
      | "stock"
      | "sku"
      | "category",
  ) => ({
    name,
    value: values[name],
    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => setValues({ ...values, [name]: e.target.value }),
    error: errors?.[name],
  });
  function move(index: number, offset: number) {
    setImages((current) => {
      const next = [...current];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
  }
  return (
    <form
      action={action}
      className="admin-product-form"
      aria-busy={pending || uploading}
    >
      <input
        type="hidden"
        name="operation"
        value={product || state?.ok ? "edit" : "create"}
      />
      <input
        type="hidden"
        name="id"
        value={product?.id ?? (state?.ok ? state.data.id : "")}
      />
      <FormFeedback state={state}>
        <Link href={`/admin/products/${state?.ok ? state.data.id : ""}/edit`}>
          ویرایش محصول
        </Link>{" "}
        · <Link href="/admin/products">فهرست محصولات</Link>
      </FormFeedback>
      <fieldset
        disabled={pending || uploading}
        className="admin-form-body admin-editor-layout"
      >
        <div className="admin-editor-media">
          <FormSection
            title="تصاویر محصول"
            description="اولین تصویر، تصویر اصلی است. حداکثر هشت نشانی تصویر وارد کنید."
          >
            <div className="admin-span admin-image-list">
              {images.map((url, index) => (
                <div key={index} className="admin-image-row">
                  <ImagePreview
                    onUploadingChange={setUploading}
                    onUpload={(url) =>
                      setImages((current) =>
                        current.map((value, i) => (i === index ? url : value)),
                      )
                    }
                    src={url}
                    alt={`تصویر ${toPersianDigits(index + 1)} محصول`}
                  />
                  <div className="admin-image-controls">
                    <FormField
                      label={
                        index === 0
                          ? "تصویر اصلی"
                          : `تصویر ${toPersianDigits(index + 1)}`
                      }
                      name="images"
                      dir="ltr"
                      required
                      value={url}
                      onChange={(e) =>
                        setImages(
                          images.map((v, i) =>
                            i === index ? e.target.value : v,
                          ),
                        )
                      }
                    />
                    <div className="admin-actions admin-image-actions">
                      <button
                        type="button"
                        aria-label={`جابه‌جایی تصویر ${toPersianDigits(index + 1)} به بالا`}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`جابه‌جایی تصویر ${toPersianDigits(index + 1)} به پایین`}
                        disabled={index === images.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={images.length === 1}
                        aria-label={`حذف تصویر ${toPersianDigits(index + 1)}`}
                        onClick={() =>
                          setImages(images.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {errors?.images && (
              <p className="admin-field-error admin-span">
                {errors.images.join("، ")}
              </p>
            )}
            <button
              type="button"
              disabled={images.length >= 8}
              onClick={() => setImages([...images, ""])}
            >
              <Plus size={18} aria-hidden="true" />
              افزودن تصویر
            </button>
          </FormSection>
        </div>
        <div className="admin-editor-main">
          <FormSection
            title="اطلاعات اصلی"
            description="نام، دسته‌بندی و توضیحات محصول را برای مشتری مشخص کنید."
          >
            <FormField
              label="عنوان محصول"
              fullWidth
              required
              maxLength={150}
              {...field("title")}
            />
            <FormSelect label="دسته‌بندی" required {...field("category")}>
              <option value="">انتخاب دسته‌بندی</option>
              {categories.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </FormSelect>
            <FormSelect
              label="برند"
              name="brand"
              required
              error={errors?.brand}
              value={values.brand}
              onChange={(e) => setValues({ ...values, brand: e.target.value })}
            >
              <option value="">انتخاب برند</option>
              {brands.map((item) => (
                <option
                  value={item.id}
                  key={item.id}
                  disabled={!item.isActive && item.id !== brandId}
                >
                  {item.name}
                  {!item.isActive && " (غیرفعال)"}
                </option>
              ))}
            </FormSelect>
            <FormField
              label="نامک"
              fullWidth
              hint="خالی بگذارید تا از عنوان ساخته شود."
              {...field("slug")}
            />
            {!brands.some((item) => item.isActive || item.id === brandId) && (
              <p className="admin-error admin-span">
                برای ذخیره محصول ابتدا{" "}
                <Link href="/admin/brands/new">یک برند فعال بسازید</Link>.
              </p>
            )}
            {!categories.length && (
              <p className="admin-error admin-span">
                ابتدا{" "}
                <Link href="/admin/categories/new">یک دسته‌بندی بسازید</Link> تا
                امکان ذخیره محصول فراهم شود.
              </p>
            )}
            <FormTextarea
              label="توضیحات محصول"
              required
              {...field("description")}
            />
          </FormSection>
          <FormSection title="قیمت و موجودی">
            <FormField
              label="قیمت فروش (تومان)"
              inputMode="numeric"
              required
              {...field("price")}
            />
            <FormField
              label="قیمت قبلی (تومان)"
              inputMode="numeric"
              hint="برای تخفیف؛ باید از قیمت فروش بیشتر باشد."
              {...field("compareAtPrice")}
            />
            <FormField
              label="موجودی"
              inputMode="numeric"
              required
              {...field("stock")}
            />
            <FormField label="شناسهٔ کالا" dir="ltr" {...field("sku")} />
          </FormSection>
          <FormSection
            title="مشخصات فنی"
            description="ویژگی‌هایی مثل ظرفیت، ابعاد و ردهٔ انرژی را وارد کنید."
          >
            <div className="admin-span">
              {!attributes.length && (
                <p className="admin-hint">هنوز مشخصه‌ای اضافه نشده است.</p>
              )}
              {attributes.map((attribute, index) => (
                <div key={index} className="admin-attribute-row">
                  <FormField
                    label="نام مشخصه"
                    name="attributeKey"
                    required
                    value={attribute.key}
                    onChange={(e) =>
                      setAttributes(
                        attributes.map((v, i) =>
                          i === index ? { ...v, key: e.target.value } : v,
                        ),
                      )
                    }
                  />
                  <FormField
                    label="مقدار مشخصه"
                    name="attributeValue"
                    required
                    value={attribute.value}
                    onChange={(e) =>
                      setAttributes(
                        attributes.map((v, i) =>
                          i === index ? { ...v, value: e.target.value } : v,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    aria-label={`حذف مشخصه ${toPersianDigits(index + 1)}`}
                    onClick={() =>
                      setAttributes(attributes.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 size={18} aria-hidden="true" />
                    حذف
                  </button>
                </div>
              ))}
            </div>
            {errors?.attributes && (
              <p className="admin-field-error admin-span">
                {errors.attributes.join("، ")}
              </p>
            )}
            <button
              type="button"
              onClick={() =>
                setAttributes([...attributes, { key: "", value: "" }])
              }
            >
              <Plus size={18} aria-hidden="true" />
              افزودن مشخصه
            </button>
          </FormSection>
        </div>
        <aside className="admin-editor-aside" aria-label="تنظیمات نمایش">
          <FormSection title="انتشار محصول">
            <FormToggle
              label="محصول فعال"
              description="نمایش در فروشگاه"
              name="isActive"
              checked={values.isActive}
              onChange={(e) =>
                setValues({ ...values, isActive: e.target.checked })
              }
            />
            <FormToggle
              label="محصول ویژه"
              description="نمایش در محصولات منتخب"
              name="isFeatured"
              checked={values.isFeatured}
              onChange={(e) =>
                setValues({ ...values, isFeatured: e.target.checked })
              }
            />
          </FormSection>
          {product && (
            <p className="admin-hint">
              فروش: {toPersianDigits(product.soldCount)} · ایجاد:{" "}
              {formatDate(product.createdAt)} · آخرین ویرایش:{" "}
              {formatDate(product.updatedAt)}
            </p>
          )}
        </aside>
        <div className="admin-form-footer">
          <button
            type="submit"
            className="admin-primary"
            disabled={
              !categories.length ||
              !brands.some((item) => item.isActive || item.id === brandId)
            }
          >
            <Save size={18} aria-hidden="true" />
            {pending ? "در حال ذخیره…" : "ذخیره محصول"}
          </button>
          <Link href="/admin/products">بازگشت به محصولات</Link>
        </div>
      </fieldset>
    </form>
  );
}
