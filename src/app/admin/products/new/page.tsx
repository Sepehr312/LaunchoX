import { AdminFormPage } from "@/components/admin/AdminFormPage";
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
    <AdminFormPage
      title="محصول جدید"
      description="اطلاعات، تصاویر و وضعیت انتشار محصول را مدیریت کنید."
      listLabel="محصولات"
      listHref="/admin/products"
    >
      <ProductForm
        categories={categories}
        brands={brands.map(({ id, name, isActive }) => ({
          id,
          name,
          isActive,
        }))}
      />
    </AdminFormPage>
  );
}
