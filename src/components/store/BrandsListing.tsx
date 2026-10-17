"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ChevronLeft, Search, Snowflake, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { toPersianDigits } from "@/lib/format";
import type { StoreBrandDTO } from "@/types/dto";
import { brandSearchSchema } from "@/validations/brand";
import styles from "./BrandsListing.module.css";

function BrandLogo({ brand }: { brand: StoreBrandDTO }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.logo}>
      {brand.logo && !failed ? (
        <Image
          src={brand.logo}
          alt={`لوگوی ${brand.name}`}
          width={180}
          height={72}
          unoptimized
          className="object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <Snowflake size={40} strokeWidth={1.2} aria-hidden="true" />
      )}
    </div>
  );
}

export function BrandsListing({ brands }: { brands: StoreBrandDTO[] }) {
  const [search, setSearch] = useState("");
  const parsed = brandSearchSchema.safeParse(search);
  const term = parsed.success ? parsed.data : "";
  const visible = brands
    .filter((brand) =>
      [brand.name, brand.slug].some((value) => {
        const normalized = brandSearchSchema.safeParse(value);
        return normalized.success && normalized.data.includes(term);
      }),
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, "fa", {
          sensitivity: "base",
          numeric: true,
        }) || a.slug.localeCompare(b.slug, "en"),
    );

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="brands-title">
        <div className="store-shell">
          <nav aria-label="مسیر صفحه" className={styles.breadcrumb}>
            <Link href="/">خانه</Link>
            <ChevronLeft size={14} aria-hidden="true" />
            <span aria-current="page">برندها</span>
          </nav>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <Snowflake size={16} aria-hidden="true" /> دنیای برندها
            </span>
            <h1 id="brands-title">برند مورد علاقه‌ات رو پیدا کن</h1>
            <p>مجموعه‌ای از برندهای یخچال و فریزر، برای یک انتخاب مطمئن‌تر</p>
            <div className={styles.search}>
              <label htmlFor="brand-search" className="sr-only">
                جست‌وجوی برند
              </label>
              <Search size={21} aria-hidden="true" />
              <Input
                id="brand-search"
                type="search"
                value={search}
                maxLength={120}
                placeholder="نام فارسی یا انگلیسی برند را بنویس…"
                autoComplete="off"
                onChange={(event) => {
                  if (brandSearchSchema.safeParse(event.target.value).success)
                    setSearch(event.target.value);
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="پاک کردن جست‌وجو"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
      <div className="store-shell">
        <section className={styles.list} aria-labelledby="all-brands">
          <div className={styles.heading}>
            <div>
              <h2 id="all-brands">تمام برندها</h2>
              <p>یک نام آشنا، شروع یک انتخاب مطمئن</p>
            </div>
            <span role="status" aria-live="polite">
              {toPersianDigits(visible.length)} برند
              {term && ` از ${toPersianDigits(brands.length)}`}
            </span>
          </div>
          {visible.length ? (
            <div className={styles.grid}>
              {visible.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/brands/${encodeURIComponent(brand.slug)}`}
                  className={styles.card}
                >
                  <BrandLogo brand={brand} />
                  <h3>{brand.name}</h3>
                  <p>{toPersianDigits(brand.productCount)} محصول</p>
                  <span className={styles.cardLink}>
                    مشاهده محصولات <ArrowLeft size={16} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <Search size={32} aria-hidden="true" />
              <h3>
                {brands.length
                  ? "برندی با این نام پیدا نشد"
                  : "هنوز برندی برای نمایش وجود ندارد"}
              </h3>
              <p>
                {brands.length
                  ? "نام دیگری را امتحان کنید یا جست‌وجو را پاک کنید."
                  : "پس از اضافه شدن برندهای فعال، می‌توانید آن‌ها را اینجا ببینید."}
              </p>
              {search && (
                <button type="button" onClick={() => setSearch("")}>
                  نمایش تمام برندها
                </button>
              )}
            </div>
          )}
        </section>
        <section className={styles.guide} aria-labelledby="brand-guide">
          <div className={styles.guideIcon}>
            <Snowflake size={30} aria-hidden="true" />
          </div>
          <div>
            <h2 id="brand-guide">انتخاب یخچال بر اساس برند</h2>
            <p>
              از برند دلخواهتان شروع کنید و مدل‌ها را از نظر ظرفیت، مصرف انرژی و
              فضای آشپزخانه مقایسه کنید. پیش از خرید، ابعاد دستگاه و شرایط
              گارانتی هر محصول را بررسی کنید تا انتخابی متناسب با نیازتان داشته
              باشید.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
