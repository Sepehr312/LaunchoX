import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { readContent } from "@/services/content.service";
import { getSiteSettings } from "@/services/site.service";
import { defaultServicesPage } from "@/lib/services-defaults";
import { prepareServicesPage } from "@/lib/services-defaults";
import { aboutSectionIdSchema } from "@/validations/about-sections";
import { AboutSectionEditor } from "@/components/admin/AboutSectionEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "ویرایش بخش خدمات | پنل مدیریت" };

export default async function EditServicesSectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const parsed = aboutSectionIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const content = await readContent("services");
  const page = prepareServicesPage(
    content?.key === "services" ? content.data : defaultServicesPage,
  );
  const section = page.sections.find((item) => item.id === parsed.data);
  if (!section) notFound();
  return (
    <AboutSectionEditor
      key={section.id}
      pageKey="services"
      initial={section}
      contact={await getSiteSettings()}
    />
  );
}
