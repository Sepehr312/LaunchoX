import Link from "next/link";
import type { CategoryDTO } from "@/types/dto";
import { SnowflakeIcon } from "@/components/store/Icons";

export function StoreFooter({ categories }: { categories: CategoryDTO[] }) {
  return (
    <footer className="store-footer">
      <div className="store-shell grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:py-16">
        <div className="max-w-md">
          <div className="brand-mark mb-5">
            <SnowflakeIcon className="size-10" />
            <span>
              <strong>لانچ‌اوکس</strong>
              <small>فروشگاه تخصصی لوازم سرمایشی</small>
            </span>
          </div>
          <p className="text-sm leading-7 text-muted">
            انتخاب تخصصی یخچال و تجهیزات سرمایشی با مشخصات شفاف، مشاورهٔ دقیق و
            تجربه‌ای به خنکی یک نمایشگاه قطبی.
          </p>
        </div>
        <div>
          <h2 className="footer-title">دسترسی سریع</h2>
          <nav className="footer-links" aria-label="دسترسی سریع">
            <Link href="/products">همه محصولات</Link>
            <Link href="/search">جستجوی محصولات</Link>
            <Link href="/login">ورود به حساب</Link>
          </nav>
        </div>
        <div>
          <h2 className="footer-title">دسته‌بندی‌ها</h2>
          <nav className="footer-links" aria-label="دسته‌بندی‌های فوتر">
            {categories.slice(0, 5).map((category) => (
              <Link key={category.id} href={`/categories/${category.slug}`}>
                {category.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="border-t border-border/70">
        <div className="store-shell flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© ۱۴۰۵ لانچ‌اوکس؛ همهٔ حقوق محفوظ است.</p>
          <p>پشتیبانی: ۰۲۱-۸۸۸۸۸۸۸۸</p>
        </div>
      </div>
    </footer>
  );
}
