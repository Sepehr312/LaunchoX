import { AdminFormPage } from "@/components/admin/AdminFormPage";
import { requireAdmin } from "@/lib/auth";
import { BrandForm } from "@/components/admin/BrandForm";
export const dynamic = "force-dynamic";
export const metadata = { title: "برند جدید | لانچ‌اوکس" };
export default async function NewBrand() {
  await requireAdmin();
  return (
    <AdminFormPage
      title="برند جدید"
      description="هویت برند، لوگو و نحوهٔ نمایش آن در فروشگاه را مشخص کنید."
      listLabel="برندها"
      listHref="/admin/brands"
    >
      <BrandForm />
    </AdminFormPage>
  );
}
