import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { StoreHero } from "@/components/store/StoreHero";
import { ProductGrid } from "@/components/store/ProductGrid";
import { SectionHeading } from "@/components/store/SectionHeading";
import { ChevronIcon, SnowflakeIcon } from "@/components/store/Icons";
import { listCategories } from "@/services/category.service";
import { getFeaturedProducts, listProducts } from "@/services/product.service";

export const revalidate = 300;
export const metadata: Metadata = {
  title: `صفحه اصلی | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};

export default async function HomePage() {
  const [categories, featured, newest] = await Promise.all([
    listCategories(),
    getFeaturedProducts(4),
    listProducts({ page: 1, limit: 8, sort: "newest" }),
  ]);
  return (
    <main>
      <StoreHero />

      <section className="store-section">
        <div className="store-shell">
          <SectionHeading
            eyebrow="مسیر سریع انتخاب"
            title="برای هر فضا، سرمایش مناسب"
            description="از خانه‌های کم‌جا تا آشپزخانه‌های حرفه‌ای"
          />
          {!categories.length && (
            <div className="empty-state">
              <h2>دسته‌بندی‌ای برای نمایش وجود ندارد</h2>
              <p>هنوز دسته‌بندی محصولات فروشگاه آماده نشده است.</p>
            </div>
          )}
          <div className="category-grid">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="category-card"
              >
                <span className="category-number">۰{index + 1}</span>
                <SnowflakeIcon className="size-8" />
                <div>
                  <h3>{category.name}</h3>
                  <p>
                    {category.description ?? "مشاهدهٔ مدل‌ها و مقایسهٔ مشخصات"}
                  </p>
                </div>
                <ChevronIcon className="category-arrow size-5" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="store-section pt-0">
        <div className="store-shell">
          <SectionHeading
            eyebrow="منتخب کارشناسان"
            title="محصولات ویژه"
            description="مدل‌هایی با توازن دقیق طراحی، ظرفیت و مصرف انرژی"
            href="/products?sort=bestselling"
          />
          <ProductGrid
            products={featured}
            emptyTitle="هنوز محصول ویژه‌ای وجود ندارد"
            emptyMessage="هنوز محصول ویژه‌ای برای نمایش آماده نشده است."
          />
        </div>
      </section>

      <section className="showroom-story">
        <div className="store-shell grid items-center gap-8 lg:grid-cols-2">
          <div className="showroom-image">
            <Image
              src="/images/arctic-showroom-dark.png"
              alt="نمایشگاه یخچال لانچ‌اوکس در فضای قطبی"
              fill
              sizes="(max-width: 1023px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="py-4 lg:py-16">
            <p className="section-kicker">نمایشگاه سرد، تصمیم روشن</p>
            <h2>انتخاب یخچال را از حدس‌زدن جدا کرده‌ایم</h2>
            <p>
              مشخصات فنی، ظرفیت و ردهٔ انرژی را کنار هم ببینید و مدلی متناسب با
              فضای واقعی خانه انتخاب کنید. لانچ‌اوکس برای یک خرید تخصصی، شفاف و
              آرام طراحی شده است.
            </p>
            <Link href="/products" className="inline-arrow-link">
              ورود به نمایشگاه <ChevronIcon className="size-5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="store-section">
        <div className="store-shell">
          <SectionHeading
            eyebrow="تازه‌واردهای نمایشگاه"
            title="جدیدترین محصولات"
            href="/products"
          />
          <ProductGrid
            products={newest.items}
            emptyTitle="هنوز محصولی به فروشگاه اضافه نشده است"
            emptyMessage="محصولات جدید پس از اضافه شدن در این بخش نمایش داده می‌شوند."
          />
        </div>
      </section>

      <section id="frostic-buying-guide" className="store-section scroll-mt-24 pt-0">
        <div className="store-shell">
          <SectionHeading eyebrow="پیش از انتخاب" title="پرسش‌های پرتکرار" />
          <div className="faq-grid">
            <details>
              <summary>ظرفیت مناسب را چطور انتخاب کنم؟</summary>
              <p>
                تعداد اعضای خانواده، عادت خرید و فضای نصب را هم‌زمان در نظر
                بگیرید و ظرفیت درج‌شده در مشخصات هر مدل را مقایسه کنید.
              </p>
            </details>
            <details>
              <summary>ردهٔ انرژی چه اهمیتی دارد؟</summary>
              <p>
                ردهٔ انرژی بالاتر معمولاً به مصرف برق کمتر در استفادهٔ بلندمدت
                کمک می‌کند؛ اطلاعات موجود در کارت و صفحهٔ محصول قابل مقایسه است.
              </p>
            </details>
            <details>
              <summary>چطور موجودی محصول را ببینم؟</summary>
              <p>
                وضعیت موجودی در کارت و صفحهٔ جزئیات هر محصول نمایش داده می‌شود و
                فهرست محصولات نیز فیلتر «فقط کالاهای موجود» دارد.
              </p>
            </details>
          </div>
        </div>
      </section>
    </main>
  );
}
