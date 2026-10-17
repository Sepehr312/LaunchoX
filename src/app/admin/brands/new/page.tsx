import { requireAdmin } from "@/lib/auth";
import { BrandForm } from "@/components/admin/BrandForm";
export const metadata = { title: "برند جدید | لانچ‌اوکس" };
export default async function NewBrand() {
  await requireAdmin();
  return (
    <section className="admin-panel">
      <p className="admin-eyebrow">کاتالوگ / برندها</p>
      <h1>برند جدید</h1>
      <BrandForm />
    </section>
  );
}
