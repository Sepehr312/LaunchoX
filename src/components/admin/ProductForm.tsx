"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { productAction } from "@/actions/admin/product.actions";
import { formatDate, toPersianDigits } from "@/lib/format";
import type { StoreProductDTO } from "@/types/dto";

export function ProductForm({
  product,
  categories,
}: {
  product?: StoreProductDTO;
  categories: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(productAction, undefined);
  const [images, setImages] = useState(product?.images ?? [""]);
  const [attributes, setAttributes] = useState<
    { key: string; value: string }[]
  >(product?.attributes ?? []);
  function move(index: number, offset: number) {
    setImages((current) => {
      const next = [...current];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
  }
  function errors(name: string) {
    return state && !state.ok
      ? state.fieldErrors?.[name]?.map((error, i) => (
          <p className="text-danger" key={i}>
            {error}
          </p>
        ))
      : null;
  }
  const fields = [
    ["title", "عنوان", product?.title],
    ["slug", "نامک (خالی برای ساخت خودکار)", product?.slug],
    ["price", "قیمت فروش (تومان)", product?.price],
    ["compareAtPrice", "قیمت قبلی (تومان)", product?.compareAtPrice],
    ["stock", "موجودی", product?.stock ?? 0],
    ["sku", "شناسهٔ کالا", product?.sku],
  ] as const;
  return (
    <form action={action} className="admin-product-form">
      <input
        type="hidden"
        name="operation"
        value={product ? "edit" : "create"}
      />
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <fieldset disabled={pending} className="grid min-w-0 gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([name, label, value]) => (
            <label key={name}>
              {label}
              <input
                className="field-input"
                name={name}
                defaultValue={
                  typeof value === "number" ? toPersianDigits(value) : value
                }
                required={["title", "price", "stock"].includes(name)}
                inputMode={
                  ["price", "compareAtPrice", "stock"].includes(name)
                    ? "numeric"
                    : undefined
                }
              />
              {errors(name)}
            </label>
          ))}
        </div>
        <label>
          توضیحات
          <textarea
            className="field-input"
            name="description"
            defaultValue={product?.description}
            required
            rows={5}
          />
          {errors("description")}
        </label>
        <label>
          دسته‌بندی
          <select
            className="field-input"
            name="category"
            defaultValue={product?.category.id ?? ""}
            required
          >
            <option value="">انتخاب دسته‌بندی</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors("category")}
        </label>
        {!categories.length && (
          <p>
            دسته‌بندی‌ای برای انتخاب وجود ندارد؛ ابتدا از بخش مدیریت
            دسته‌بندی‌ها یک دسته‌بندی ایجاد کنید.
          </p>
        )}
        <fieldset className="grid min-w-0 gap-3">
          <legend>نشانی تصاویر (اولین تصویر، تصویر اصلی است)</legend>
          {images.map((url, index) => (
            <div key={index} className="grid min-w-0 gap-2">
              <label>
                نشانی تصویر {toPersianDigits(index + 1)}
                <input
                  className="field-input"
                  name="images"
                  dir="ltr"
                  value={url}
                  onChange={(event) =>
                    setImages(
                      images.map((value, i) =>
                        i === index ? event.target.value : value,
                      ),
                    )
                  }
                  required
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  بالاتر
                </button>
                <button
                  type="button"
                  disabled={index === images.length - 1}
                  onClick={() => move(index, 1)}
                >
                  پایین‌تر
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setImages(images.filter((_, i) => i !== index))
                  }
                >
                  حذف تصویر
                </button>
              </div>
            </div>
          ))}
          {errors("images")}
          <button
            type="button"
            disabled={images.length >= 8}
            onClick={() => setImages([...images, ""])}
          >
            افزودن تصویر
          </button>
        </fieldset>
        <fieldset className="grid min-w-0 gap-3">
          <legend>مشخصات محصول</legend>
          {attributes.map((attribute, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-3">
              <label>
                کلید مشخصه
                <input
                  className="field-input"
                  name="attributeKey"
                  value={attribute.key}
                  required
                  onChange={(event) =>
                    setAttributes(
                      attributes.map((value, i) =>
                        i === index
                          ? { ...value, key: event.target.value }
                          : value,
                      ),
                    )
                  }
                />
              </label>
              <label>
                مقدار مشخصه
                <input
                  className="field-input"
                  name="attributeValue"
                  value={attribute.value}
                  required
                  onChange={(event) =>
                    setAttributes(
                      attributes.map((value, i) =>
                        i === index
                          ? { ...value, value: event.target.value }
                          : value,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  setAttributes(attributes.filter((_, i) => i !== index))
                }
              >
                حذف مشخصه
              </button>
            </div>
          ))}
          {errors("attributes")}
          <button
            type="button"
            onClick={() =>
              setAttributes([...attributes, { key: "", value: "" }])
            }
          >
            افزودن مشخصه
          </button>
        </fieldset>
        <label>
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={product?.isActive ?? true}
          />{" "}
          محصول فعال
        </label>
        <label>
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={product?.isFeatured ?? false}
          />{" "}
          محصول ویژه
        </label>
        {product && (
          <p className="break-all">
            شناسه: {product.id} · تعداد فروش:{" "}
            {toPersianDigits(product.soldCount)} · ایجاد:{" "}
            {formatDate(product.createdAt)} · آخرین ویرایش:{" "}
            {formatDate(product.updatedAt)}
          </p>
        )}
        <button type="submit" disabled={!categories.length}>
          {pending ? "در حال ذخیره…" : "ذخیره محصول"}
        </button>
      </fieldset>
      {state && !state.ok && (
        <p role="alert" className="text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status">
          محصول ذخیره شد.{" "}
          <Link href={`/admin/products/${state.data.id}/edit`}>
            ویرایش محصول
          </Link>{" "}
          · <Link href="/admin/products">بازگشت به محصولات</Link>
        </p>
      )}
      <Link href="/admin/products">بازگشت</Link>
    </form>
  );
}
