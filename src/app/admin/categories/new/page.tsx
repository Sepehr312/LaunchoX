import { AdminFormPage } from "@/components/admin/AdminFormPage";
import { getEnv } from "@/lib/env";
import { requireAdmin } from "@/lib/auth";
import { listCategoriesAdmin } from "@/services/category.service";
import { CategoryForm } from "@/components/admin/CategoryForm";
export const dynamic = "force-dynamic";
export const metadata = {
  title: `دسته‌بندی جدید | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};
export default async function NewCategory() {
  await requireAdmin();
  const categories = await listCategoriesAdmin();
  return (
    <AdminFormPage
      title="دسته‌بندی جدید"
      description="اطلاعات و تصویر دسته‌بندی و جایگاه آن در فروشگاه را مشخص کنید."
      listLabel="دسته‌بندی‌ها"
      listHref="/admin/categories"
    >
      <CategoryForm categories={categories} />
    </AdminFormPage>
  );
}
