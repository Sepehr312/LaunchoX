"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ChevronLeft, Search, Snowflake, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toPersianDigits } from "@/lib/format";
import {
  brandHref,
  brandSearchSchema,
  brandSortSchema,
  selectBrands,
  type ListingBrand,
} from "./brands-data";
import styles from "./BrandsListing.module.css";

function BrandLogo({ brand }: { brand: ListingBrand }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.logo}>
      {brand.logo && !failed ? (
        <Image
          src={brand.logo}
          alt={`نشان ${brand.name}`}
          width={160}
          height={80}
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className={styles.placeholder}
          aria-label={`نشان ${brand.name} ثبت نشده است`}
        >
          <Snowflake aria-hidden="true" size={28} strokeWidth={1.25} />
          <span>{brand.name}</span>
        </div>
      )}
    </div>
  );
}

export function BrandsListing({ brands }: { brands: ListingBrand[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const visible = selectBrands(brands, query, sort);
  return (
    <main data-brands-listing>
      <section className={styles.hero} aria-labelledby="brands-title">
        <div className={styles.shell}>
          <nav aria-label="مسیر صفحه" className={styles.breadcrumb}>
            <Link href="/">خانه</Link>
            <ChevronLeft size={14} aria-hidden="true" />
            <span aria-current="page">برندها</span>
          </nav>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>
              <Snowflake size={16} aria-hidden="true" /> دنیای برندهای لانچ‌اوکس
            </span>
            <h1 id="brands-title">برند مورد علاقه‌ات رو پیدا کن</h1>
            <p>مجموعه‌ای از برندهای یخچال و فریزر، برای یک انتخاب مطمئن‌تر</p>
            <div
              className={styles.search}
              role="search"
              aria-label="جست‌وجوی برندها"
            >
              <Search size={22} aria-hidden="true" />
              <label className="sr-only" htmlFor="brand-search">
                جست‌وجوی برند
              </label>
              <Input
                id="brand-search"
                type="search"
                placeholder="نام برند را فارسی یا انگلیسی بنویس..."
                value={query}
                maxLength={200}
                onChange={(event) => {
                  const parsed = brandSearchSchema.safeParse(
                    event.target.value,
                  );
                  if (parsed.success) setQuery(parsed.data);
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="پاک کردن جست‌وجو"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
      <div className={styles.shell}>
        <section className={styles.catalog} aria-labelledby="all-brands-title">
          <div className={styles.toolbar}>
            <div className={styles.heading}>
              <h2 id="all-brands-title">تمام برندها</h2>
              <span role="status" aria-live="polite">
                {toPersianDigits(visible.length)} برند
              </span>
            </div>
            <label className={styles.sort}>
              مرتب‌سازی
              <select
                value={sort}
                onChange={(event) => {
                  const parsed = brandSortSchema.safeParse(event.target.value);
                  if (parsed.success) setSort(parsed.data);
                }}
              >
                <option value="asc">نام برند: الف تا ی</option>
                <option value="desc">نام برند: ی تا الف</option>
              </select>
            </label>
          </div>
          {visible.length ? (
            <ul className={styles.grid}>
              {visible.map((brand) => (
                <li key={brand.slug}>
                  <Link
                    className={styles.card}
                    href={brandHref(brand.slug)}
                    prefetch={false}
                  >
                    <BrandLogo brand={brand} />
                    <h3>{brand.name}</h3>
                    <p>{toPersianDigits(brand.productCount)} محصول</p>
                    <span className={styles.cardAction}>
                      مشاهده محصولات <ArrowLeft size={16} aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.empty}>
              <Search size={32} aria-hidden="true" />
              <h3>
                {query
                  ? "برندی با این نام پیدا نشد"
                  : "هنوز برندی ثبت نشده است"}
              </h3>
              <p>
                {query
                  ? "نام دیگری را امتحان کن یا جست‌وجو را پاک کن."
                  : "برندهای فروشگاه به‌زودی در این بخش نمایش داده می‌شوند."}
              </p>
              {query && (
                <Button variant="secondary" onClick={() => setQuery("")}>
                  نمایش تمام برندها
                </Button>
              )}
            </div>
          )}
        </section>
        <section className={styles.guide} aria-labelledby="brand-guide-title">
          <span className={styles.guideIcon}>
            <Snowflake size={28} strokeWidth={1.3} aria-hidden="true" />
          </span>
          <div>
            <h2 id="brand-guide-title">انتخاب یخچال بر اساس برند</h2>
            <p>
              با ورود به محصولات هر برند، ظرفیت، مصرف انرژی و امکانات مدل‌ها را
              بررسی کن. ابعاد آشپزخانه، نیاز خانواده و بودجه‌ات را کنار هم بگذار
              تا انتخاب مناسب‌تری داشته باشی.
            </p>
          </div>
          <Link href="/products">
            بررسی همه محصولات <ArrowLeft size={18} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </main>
  );
}
