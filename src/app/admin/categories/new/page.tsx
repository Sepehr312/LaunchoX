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
    <section className="admin-panel">
      <h1>دسته‌بندی جدید</h1>
      <CategoryForm categories={categories} />
    </section>
  );
}
