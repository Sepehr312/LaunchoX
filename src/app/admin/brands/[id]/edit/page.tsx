import { AdminFormPage } from "@/components/admin/AdminFormPage";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getBrand } from "@/services/brand.service";
import { brandIdSchema } from "@/validations/brand";
import { BrandForm } from "@/components/admin/BrandForm";
export const dynamic = "force-dynamic";
export const metadata = { title: "ویرایش برند | لانچ‌اوکس" };
export default async function EditBrand({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const parsed = brandIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const brand = await getBrand(parsed.data);
  if (!brand) notFound();
  return (
    <AdminFormPage
      title="ویرایش برند"
      description="هویت برند، لوگو و نحوهٔ نمایش آن در فروشگاه را مشخص کنید."
      listLabel="برندها"
      listHref="/admin/brands"
    >
      <BrandForm key={brand.id} brand={brand} />
    </AdminFormPage>
  );
}
