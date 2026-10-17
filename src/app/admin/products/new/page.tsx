import { getEnv } from "@/lib/env";
import { requireAdmin } from "@/lib/auth";
import { getProductCategoryOptions } from "@/services/product.service";
import { ProductForm } from "@/components/admin/ProductForm";
import { listBrands } from "@/services/brand.service";
export const dynamic = "force-dynamic";
export const metadata = {
  title: `محصول جدید | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};
export default async function NewProduct() {
  await requireAdmin();
  const [categories, brands] = await Promise.all([
    getProductCategoryOptions(),
    listBrands(),
  ]);
  return (
    <section className="admin-panel">
      <h1>محصول جدید</h1>
      <ProductForm
        categories={categories}
        brands={brands.map(({ id, name, isActive }) => ({
          id,
          name,
          isActive,
        }))}
      />
    </section>
  );
}
