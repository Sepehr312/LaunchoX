import { AdminFormPage } from "@/components/admin/AdminFormPage";
import { getEnv } from "@/lib/env";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  getProductAdmin,
  getProductCategoryOptions,
} from "@/services/product.service";
import { objectIdSchema } from "@/validations/common";
import { ProductForm } from "@/components/admin/ProductForm";
import { listBrands } from "@/services/brand.service";
export const dynamic = "force-dynamic";
export const metadata = {
  title: `ویرایش محصول | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};
export default async function EditProduct({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const parsed = objectIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const [product, categories, brands] = await Promise.all([
    getProductAdmin(parsed.data),
    getProductCategoryOptions(),
    listBrands(),
  ]);
  if (!product) notFound();
  return (
    <AdminFormPage
      title="ویرایش محصول"
      description="اطلاعات، تصاویر و وضعیت انتشار محصول را مدیریت کنید."
      listLabel="محصولات"
      listHref="/admin/products"
    >
      <ProductForm
        key={product.id}
        product={product}
        brandId={product.brand}
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
