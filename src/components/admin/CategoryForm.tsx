"use client";
import Link from "next/link";
import { useActionState } from "react";
import { categoryAction } from "@/actions/admin/category.actions";
import { toPersianDigits } from "@/lib/format";
import type { CategoryDTO } from "@/types/dto";
export function CategoryForm({
  category,
  categories,
}: {
  category?: CategoryDTO;
  categories: CategoryDTO[];
}) {
  const [state, action, pending] = useActionState(categoryAction, undefined);
  const hasChildren =
    !!category && categories.some((item) => item.parent === category.id);
  const parents = categories.filter(
    (item) => !item.parent && item.id !== category?.id && !hasChildren,
  );
  return (
    <form action={action} className="admin-product-form">
      <input
        type="hidden"
        name="operation"
        value={category ? "edit" : "create"}
      />
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <fieldset disabled={pending} className="grid min-w-0 gap-5">
        {(
          [
            ["name", "نام دسته‌بندی", category?.name],
            ["slug", "نامک (خالی برای ساخت خودکار)", category?.slug],
            ["image", "نشانی تصویر", category?.image],
            ["order", "ترتیب نمایش", toPersianDigits(category?.order ?? 0)],
          ] as const
        ).map(([name, label, value]) => (
          <label key={name}>
            {label}
            <input
              className="field-input"
              name={name}
              defaultValue={value}
              required={name === "name" || name === "order"}
              inputMode={name === "order" ? "numeric" : undefined}
            />
          </label>
        ))}
        <label>
          دستهٔ والد
          <select
            aria-label="دستهٔ والد"
            className="field-input"
            name="parent"
            defaultValue={category?.parent ?? ""}
          >
            <option value="">بدون والد</option>
            {parents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.isActive ? "" : " (غیرفعال)"}
              </option>
            ))}
          </select>
        </label>
        {hasChildren && (
          <p>این دسته زیردسته دارد و نمی‌تواند والد داشته باشد.</p>
        )}
        <label>
          توضیحات
          <textarea
            className="field-input"
            name="description"
            defaultValue={category?.description}
            rows={4}
          />
        </label>
        <label>
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={category?.isActive ?? true}
          />{" "}
          دسته‌بندی فعال
        </label>
        <button type="submit">
          {pending ? "در حال ذخیره…" : "ذخیره دسته‌بندی"}
        </button>
      </fieldset>
      {state && !state.ok && (
        <div role="alert" className="text-danger">
          <p>{state.error}</p>
          {Object.entries(state.fieldErrors ?? {}).map(([field, errors]) => (
            <p key={field}>{errors.join("، ")}</p>
          ))}
        </div>
      )}
      {state?.ok && (
        <p role="status">
          دسته‌بندی ذخیره شد.{" "}
          <Link href={`/admin/categories/${state.data.id}/edit`}>
            ویرایش دسته‌بندی
          </Link>
        </p>
      )}
      <Link href="/admin/categories">بازگشت به دسته‌بندی‌ها</Link>
    </form>
  );
}
