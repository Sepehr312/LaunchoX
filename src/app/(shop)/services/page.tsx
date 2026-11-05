import { notFound } from "next/navigation";
import Link from "next/link";
import { readContent } from "@/services/content.service";
import { getSiteSettings } from "@/services/site.service";
import {
  defaultServicesPage,
  prepareServicesPage,
} from "@/lib/services-defaults";
import { ServicesSections } from "@/components/store/ServicesSections";
import styles from "./services.module.css";
export const metadata = {
  title: "خدمات و پشتیبانی | لانچ‌اوکس",
  description: "راهنمای خرید، تحویل، نصب و پشتیبانی لانچ‌اوکس",
};
export default async function ServicesPage() {
  const saved = await readContent("services");
  const page = prepareServicesPage(
    saved?.key === "services" ? saved.data : defaultServicesPage,
  );
  if (!page.isActive) notFound();
  return (
    <main className={styles.page}>
      <div className="store-shell">
        <nav className={styles.breadcrumb} aria-label="مسیر صفحه">
          <Link href="/">خانه</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{page.title}</span>
        </nav>
        {!page.sections.some((s) => s.isActive !== false) && (
          <p className="py-12">در حال حاضر بخشی برای نمایش وجود ندارد.</p>
        )}
        <ServicesSections
          sections={page.sections}
          contact={await getSiteSettings()}
        />
      </div>
    </main>
  );
}
