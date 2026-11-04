import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/services/site.service";
import { createAboutSection } from "@/components/admin/about-templates";
import { AboutSectionEditor } from "@/components/admin/AboutSectionEditor";
import { sectionTemplateSchema } from "@/validations/about-sections";

export const dynamic = "force-dynamic";
export const metadata = { title: "افزودن بخش درباره ما | پنل مدیریت" };

export default async function NewAboutSectionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const parsed = sectionTemplateSchema.safeParse(
    (await searchParams).template ?? "introduction",
  );
  if (!parsed.success) notFound();
  const section = createAboutSection(parsed.data);
  return (
    <AboutSectionEditor
      key={section.id}
      initial={section}
      contact={await getSiteSettings()}
      create
    />
  );
}
