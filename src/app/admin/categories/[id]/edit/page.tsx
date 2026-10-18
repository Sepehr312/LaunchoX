import { AdminFormPage } from "@/components/admin/AdminFormPage";
import { getEnv } from "@/lib/env";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  getCategoryAdmin,
  listCategoriesAdmin,
} from "@/services/category.service";
import { objectIdSchema } from "@/validations/common";
import { CategoryForm } from "@/components/admin/CategoryForm";
export const dynamic = "force-dynamic";
export const metadata = {
  title: `ویرایش دسته‌بندی | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};
export default async function EditCategory({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const parsed = objectIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const [category, categories] = await Promise.all([
    getCategoryAdmin(parsed.data),
    listCategoriesAdmin(),
  ]);
  if (!category) notFound();
  return (
    <AdminFormPage
      title="ویرایش دسته‌بندی"
      description="اطلاعات و تصویر دسته‌بندی و جایگاه آن در فروشگاه را مشخص کنید."
      listLabel="دسته‌بندی‌ها"
      listHref="/admin/categories"
    >
      <CategoryForm
        key={category.id}
        category={category}
        categories={categories}
      />
    </AdminFormPage>
  );
}
