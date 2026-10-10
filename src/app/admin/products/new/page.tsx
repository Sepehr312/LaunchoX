import { getEnv } from "@/lib/env";
import { requireAdmin } from "@/lib/auth";
import { getProductCategoryOptions } from "@/services/product.service";
import { ProductForm } from "@/components/admin/ProductForm";
export const dynamic = "force-dynamic";
export const metadata = {
  title: `محصول جدید | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};
export default async function NewProduct() {
  await requireAdmin();
  const categories = await getProductCategoryOptions();
  return (
    <section className="admin-panel">
      <h1>محصول جدید</h1>
      <ProductForm categories={categories} />
    </section>
  );
}
