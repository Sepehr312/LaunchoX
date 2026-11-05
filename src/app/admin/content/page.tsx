import Link from "next/link";
import { defaultServicesPage } from "@/lib/services-defaults";
import { ArrowUpLeft, Images, Info, Layers, Phone } from "lucide-react";
import { getEnv } from "@/lib/env";
import styles from "@/components/admin/SliderEditor.module.css";
import { requireAdmin } from "@/lib/auth";
import { readContent } from "@/services/content.service";
import { getSiteSettings } from "@/services/site.service";
import { defaultSlides } from "@/lib/content-defaults";
import { defaultAboutPage } from "@/components/store/about-defaults";
import { contentKeySchema } from "@/validations/content";
import { ContentEditor } from "@/components/admin/ContentEditor";
export const dynamic = "force-dynamic";
export const metadata = {
  title: `مدیریت محتوای فروشگاه | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};
export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const parsed = contentKeySchema.safeParse(query.section ?? "slides");
  const key = parsed.success ? parsed.data : "slides";
  let initial = await readContent(key);
  if (!initial) {
    const site = await getSiteSettings();
    initial =
      key === "slides"
        ? { key, data: defaultSlides.map((s) => ({ ...s, isActive: true })) }
        : key === "contact"
          ? {
              key,
              data: {
                phone: site.phone,
                email: site.email,
                address: site.address,
              },
            }
          : key === "about"
            ? { key, data: defaultAboutPage }
            : { key, data: defaultServicesPage };
  }
  return (
    <section className={styles.page}>
      <header className="admin-panel admin-page-header admin-approved-header">
        <div>
          <p className="admin-eyebrow">پنل مدیریت / محتوای فروشگاه</p>
          <h1>مدیریت محتوای فروشگاه</h1>
          <p className="admin-hint mt-2">
            {key === "slides"
              ? "اسلایدهای صفحه اصلی فروشگاه را مدیریت کنید."
              : key === "contact"
                ? "راه‌های ارتباط با فروشگاه را به‌روز نگه دارید."
                : key === "about"
                  ? "بخش‌های صفحه درباره ما را بسازید و مدیریت کنید."
                  : "محتوای صفحات و ارتباط با مشتریان را مدیریت کنید."}
          </p>
        </div>
        <Link
          className={styles.outline}
          href={
            key === "about" ? "/about" : key === "services" ? "/services" : "/"
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          {key === "about" ? "مشاهده صفحه درباره ما" : "مشاهده فروشگاه"}{" "}
          <ArrowUpLeft size={18} aria-hidden="true" />
        </Link>
      </header>
      <nav className={styles.tabs} aria-label="بخش‌های محتوای فروشگاه">
        {[
          { id: "slides", label: "اسلایدر", icon: Images },
          { id: "contact", label: "اطلاعات تماس", icon: Phone },
          { id: "services", label: "خدمات", icon: Layers },
          { id: "about", label: "درباره ما", icon: Info },
        ].map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={"/admin/content?section=" + id}
            aria-current={id === key ? "page" : undefined}
          >
            <Icon size={20} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
      <ContentEditor
        key={key}
        initial={initial}
        contact={
          key === "about" || key === "services"
            ? await getSiteSettings()
            : undefined
        }
      />
    </section>
  );
}
