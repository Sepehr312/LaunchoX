import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  getCategoryAdmin,
  listCategoriesAdmin,
} from "@/services/category.service";
import { objectIdSchema } from "@/validations/common";
import { CategoryForm } from "@/components/admin/CategoryForm";
export const dynamic = "force-dynamic";
export const metadata = { title: "ویرایش دسته‌بندی | لانچ‌اوکس" };
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
    <section className="admin-panel">
      <h1>ویرایش دسته‌بندی</h1>
      <CategoryForm
        key={category.id}
        category={category}
        categories={categories}
      />
    </section>
  );
}
