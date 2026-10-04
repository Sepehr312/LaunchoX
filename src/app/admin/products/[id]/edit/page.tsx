import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  getProductAdmin,
  getProductCategoryOptions,
} from "@/services/product.service";
import { objectIdSchema } from "@/validations/common";
import { ProductForm } from "@/components/admin/ProductForm";
export const dynamic = "force-dynamic";
export const metadata = { title: "ویرایش محصول | لانچ‌اوکس" };
export default async function EditProduct({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const parsed = objectIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const [product, categories] = await Promise.all([
    getProductAdmin(parsed.data),
    getProductCategoryOptions(),
  ]);
  if (!product) notFound();
  return (
    <section className="admin-panel">
      <h1>ویرایش محصول</h1>
      <ProductForm key={product.id} product={product} categories={categories} />
    </section>
  );
}
