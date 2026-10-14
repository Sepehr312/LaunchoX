import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getBrand } from "@/services/brand.service";
import { brandIdSchema } from "@/validations/brand";
import { BrandForm } from "@/components/admin/BrandForm";
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
    <section className="admin-panel">
      <p className="admin-eyebrow">کاتالوگ / برندها</p>
      <h1>ویرایش برند</h1>
      <BrandForm key={brand.id} brand={brand} />
    </section>
  );
}
