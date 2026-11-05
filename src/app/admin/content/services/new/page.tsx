import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/services/site.service";
import { createServicesSection } from "@/lib/services-defaults";
import { AboutSectionEditor } from "@/components/admin/AboutSectionEditor";
import { sectionTemplateSchema } from "@/validations/about-sections";

export const dynamic = "force-dynamic";
export const metadata = { title: "افزودن بخش خدمات | پنل مدیریت" };

export default async function NewServicesSectionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const parsed = sectionTemplateSchema.safeParse(
    (await searchParams).template ?? "introduction",
  );
  if (!parsed.success) notFound();
  const section = createServicesSection(parsed.data);
  return (
    <AboutSectionEditor
      key={section.id}
      pageKey="services"
      initial={section}
      contact={await getSiteSettings()}
      create
    />
  );
}
