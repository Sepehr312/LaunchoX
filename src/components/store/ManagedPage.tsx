import Image from "next/image";
import { notFound } from "next/navigation";
import type { ManagedPage as PageData } from "@/validations/content";
import { getSiteSettings } from "@/services/site.service";
import { AboutSections } from "@/components/store/AboutSections";
import styles from "@/components/store/AboutSections.module.css";
export async function ManagedPage({
  page,
  appearance,
}: {
  page: PageData;
  appearance?: "about";
}) {
  if (!page.isActive) notFound();
  const site = await getSiteSettings();
  if (appearance === "about") {
    const sections = [...page.sections];
    if (page.questions.length)
      sections.push({
        template: "faq",
        title: "پرسش‌های متداول",
        description: "پاسخ پرسش‌های رایج شما",
        imageUrl: "",
        items: page.questions.map((item, index) => ({
          id: `legacy-${index}`,
          title: item.question,
          description: item.answer,
          icon: "info",
          isActive: true,
        })),
      });
    return (
      <main className={styles.page}>
        <h1 className="sr-only">{page.title}</h1>
        {!sections.some((section) => section.isActive !== false) && (
          <p className="store-shell py-12">{page.content}</p>
        )}
        <AboutSections sections={sections} contact={site} />
      </main>
    );
  }
  const hasTemplates =
    page.layout === "sections" ||
    page.sections.some((section) => section.template);
  return (
    <main className="store-shell grid gap-8 py-12">
      <h1 className="text-3xl font-bold">{page.title}</h1>
      <p className="leading-8 whitespace-pre-wrap">{page.content}</p>
      {hasTemplates ? (
        <AboutSections sections={page.sections} contact={site} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {page.sections
            .filter((section) => section.isActive !== false)
            .map((s, i) => (
              <section className="grid gap-4 rounded-xl border p-5" key={i}>
                {s.imageUrl && (
                  <Image
                    src={s.imageUrl}
                    alt={s.title}
                    width={800}
                    height={450}
                    className="h-auto w-full rounded"
                  />
                )}
                <h2 className="text-xl font-bold">{s.title}</h2>
                <p className="leading-8 whitespace-pre-wrap">{s.description}</p>
              </section>
            ))}
        </div>
      )}
      {page.questions.length > 0 && (
        <section>
          <h2 className="text-xl font-bold">پرسش‌های متداول</h2>
          {page.questions.map((q, i) => (
            <details key={i} className="border-b py-4">
              <summary>{q.question}</summary>
              <p className="py-3 whitespace-pre-wrap">{q.answer}</p>
            </details>
          ))}
        </section>
      )}
      {!hasTemplates && (
        <address className="grid gap-3 not-italic">
          <h2>تماس با ما</h2>
          {site.phone && <a href={"tel:" + site.phone}>{site.phone}</a>}
          {site.email && <a href={"mailto:" + site.email}>{site.email}</a>}
          <p>{site.address}</p>
        </address>
      )}
    </main>
  );
}
