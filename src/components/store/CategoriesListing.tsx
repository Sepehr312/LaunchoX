import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, Grid2X2, Snowflake } from "lucide-react";
import { catalogCategories } from "@/lib/catalog-categories";
import { toPersianDigits } from "@/lib/format";
import type { StoreCategoryDTO } from "@/types/dto";
import shared from "./BrandsListing.module.css";
import styles from "./CategoriesListing.module.css";

const descriptions: Record<string, string> = {
  twin: "فضای مستقل برای نگهداری و انجماد مواد غذایی",
  clothing: "درب‌های عریض و دسترسی راحت به مواد غذایی",
  "top-freezer": "چیدمان آشنا با فریزر در بخش بالا",
  "bottom-freezer": "دسترسی آسان‌تر به خوراکی‌های روزمره",
  digital: "یخچال و فریزر کنار هم، برای خریدهای خانوادگی",
  "home-kitchen": "یخچال و فریزر در یک بدنه برای استفادهٔ روزمره",
  books: "انتخابی جمع‌وجور برای اتاق و فضاهای کوچک",
  "sports-travel": "نگهداری و نمایش محصولات در فضای کسب‌وکار",
};

const guides = [
  {
    title: "آشپزخانهٔ کوچک",
    description:
      "ابعاد محل نصب را اندازه بگیرید؛ از مدل‌های جمع‌وجور شروع کنید.",
    slugs: ["books", "home-kitchen"],
  },
  {
    title: "خانوادهٔ پرجمعیت",
    description: "ظرفیت و چیدمان قفسه‌ها را با حجم خریدهای خانواده بسنجید.",
    slugs: ["digital", "clothing"],
  },
  {
    title: "فضای فریزر بیشتر",
    description: "گنجایش واقعی فریزر را در مشخصات هر مدل بررسی کنید.",
    slugs: ["twin", "bottom-freezer"],
  },
];

export function CategoriesListing({
  categories,
}: {
  categories: StoreCategoryDTO[];
}) {
  return (
    <main className={shared.page}>
      <section className={shared.hero} aria-labelledby="categories-title">
        <div className="store-shell">
          <nav aria-label="مسیر صفحه" className={shared.breadcrumb}>
            <Link href="/">خانه</Link>
            <ChevronLeft size={14} aria-hidden="true" />
            <span aria-current="page">دسته‌بندی‌ها</span>
          </nav>
          <div className={shared.heroCopy}>
            <span className={shared.eyebrow}>
              <Grid2X2 size={16} aria-hidden="true" /> دنیای یخچال و فریزر
            </span>
            <h1 id="categories-title">چه یخچالی برای خانه‌ات می‌خوای؟</h1>
            <p>از نوع یخچال شروع کن، بعد مدل‌ها را مقایسه کن.</p>
            <a href="#category-list" className={styles.heroLink}>
              پیدا کردن دستهٔ مناسب <ArrowLeft size={17} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
      <div className="store-shell">
        <section
          id="category-list"
          className={`${shared.list} ${styles.list}`}
          aria-labelledby="all-categories"
        >
          <div className={shared.heading}>
            <div>
              <h2 id="all-categories">دسته‌بندی محصولات</h2>
              <p>هر فضا و هر سبک زندگی، یک انتخاب متفاوت</p>
            </div>
            <span>{toPersianDigits(categories.length)} دسته‌بندی</span>
          </div>
          {categories.length ? (
            <div className={shared.grid}>
              {categories.map((category) => {
                const visual = catalogCategories.find(
                  (item) => item.slug === category.slug,
                );
                const image = visual
                  ? `/images/preview/categories/${visual.image}.png`
                  : category.image;
                return (
                  <Link
                    key={category.id}
                    href={`/categories/${encodeURIComponent(category.slug)}`}
                    className={`${shared.card} ${styles.card}`}
                  >
                    <div className={styles.image}>
                      {image ? (
                        <Image
                          src={image}
                          alt={category.name}
                          fill
                          sizes="(min-width: 1024px) 240px, (min-width: 768px) 30vw, 44vw"
                          className="object-contain"
                        />
                      ) : (
                        <Snowflake
                          size={64}
                          strokeWidth={1}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <h3>{category.name}</h3>
                    <p className={styles.description}>
                      {descriptions[category.slug] ??
                        category.description ??
                        "مدل‌های این دسته را ببینید و مشخصاتشان را مقایسه کنید."}
                    </p>
                    <span className={styles.count}>
                      {toPersianDigits(category.productCount)} محصول
                    </span>
                    <span className={shared.cardLink}>
                      مشاهده محصولات <ArrowLeft size={16} aria-hidden="true" />
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className={shared.empty}>
              <Grid2X2 size={32} aria-hidden="true" />
              <h3>هنوز دسته‌بندی‌ای برای نمایش وجود ندارد</h3>
              <p>
                پس از اضافه شدن دسته‌بندی‌های فعال، می‌توانید آن‌ها را اینجا
                ببینید.
              </p>
            </div>
          )}
        </section>
        {categories.length > 0 && (
          <section className={styles.guide} aria-labelledby="category-guide">
            <span className={shared.eyebrow}>از نیازت شروع کن</span>
            <h2 id="category-guide">هنوز نمی‌دونی کدوم نوع مناسبته؟</h2>
            <div className={styles.guideGrid}>
              {guides.map((guide) => {
                const matches = categories.filter((category) =>
                  guide.slugs.includes(category.slug),
                );
                return (
                  <article key={guide.title}>
                    <h3>{guide.title}</h3>
                    <p>{guide.description}</p>
                    <div className={styles.guideLinks}>
                      {matches.length ? (
                        matches.map((category) => (
                          <Link
                            key={category.id}
                            href={`/categories/${encodeURIComponent(category.slug)}`}
                          >
                            {category.name}
                            <ArrowLeft size={14} aria-hidden="true" />
                          </Link>
                        ))
                      ) : (
                        <Link href="/products">
                          بررسی همهٔ مدل‌ها{" "}
                          <ArrowLeft size={14} aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
        <section className={styles.allProducts} aria-label="مشاهده همه محصولات">
          <div>
            <h2>می‌خوای همهٔ گزینه‌ها رو ببینی؟</h2>
            <p>محصولات را بر اساس قیمت، ظرفیت و امکانات بررسی کن.</p>
          </div>
          <Link href="/products">
            مشاهدهٔ همهٔ محصولات <ArrowLeft size={18} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </main>
  );
}
