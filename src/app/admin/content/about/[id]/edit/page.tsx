import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { readContent } from "@/services/content.service";
import { getSiteSettings } from "@/services/site.service";
import { defaultAboutPage } from "@/lib/about-defaults";
import { prepareAboutPage } from "@/lib/about-page";
import { aboutSectionIdSchema } from "@/validations/about-sections";
import { AboutSectionEditor } from "@/components/admin/AboutSectionEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "ویرایش بخش درباره ما | پنل مدیریت" };

export default async function EditAboutSectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const parsed = aboutSectionIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const content = await readContent("about");
  const page = prepareAboutPage(
    content?.key === "about" ? content.data : defaultAboutPage,
  );
  const section = page.sections.find((item) => item.id === parsed.data);
  if (!section) notFound();
  return (
    <AboutSectionEditor
      key={section.id}
      initial={section}
      contact={await getSiteSettings()}
    />
  );
}
