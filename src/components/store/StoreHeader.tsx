"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./StoreHeader.module.css";
import type { CategoryDTO } from "@/types/dto";
import {
  MenuIcon,
  SearchIcon,
  SnowflakeIcon,
  UserIcon,
} from "@/components/store/Icons";

const mainLinks: { href?: string; label: string }[] = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/products", label: "محصولات" },
  { label: "برندها" },
  { label: "مقایسه" },
  { label: "مجله خرید" },
  { label: "خدمات پس از فروش" },
  { label: "درباره ما" },
];

export const StoreHeader: (props: {
  categories: CategoryDTO[];
}) => React.ReactNode = () => {
  const pathname = usePathname();

  return (
    <header className={`store-header ${styles.header}`}>
      <div className={`store-shell ${styles.bar}`}>
        <Link href="/" className="brand-mark shrink-0" aria-label="لانچ‌اوکس">
          <SnowflakeIcon className="size-9" />
          <span>
            <strong>لانچ‌اوکس</strong>
            <small>سرمای مطمئن، انتخاب دقیق</small>
          </span>
        </Link>

        <nav className={styles.navigation} aria-label="ناوبری اصلی">
          {mainLinks.map((link) =>
            link.href ? (
              <Link
                key={link.label}
                href={link.href}
                className="header-link"
                aria-current={pathname === link.href ? "page" : undefined}
              >
                {link.label}
              </Link>
            ) : (
              <span
                key={link.label}
                className="header-link"
                aria-disabled="true"
              >
                {link.label}
              </span>
            ),
          )}
        </nav>

        <div className={styles.actions}>
          <form action="/search" className={`header-search ${styles.search}`}>
            <SearchIcon className="size-5 shrink-0" />
            <input
              type="search"
              name="q"
              aria-label="جستجو در محصولات"
              placeholder="مدل، برند یا ظرفیت..."
            />
          </form>

          <Link href="/login" className={`header-action ${styles.account}`}>
            <UserIcon className="size-5" />
            <span>ورود / ثبت‌نام</span>
          </Link>
        </div>

        <details className="mobile-menu lg:hidden">
          <summary aria-label="باز کردن منوی موبایل">
            <MenuIcon className="size-6" />
          </summary>
          <div className="mobile-menu-backdrop" />
          <div className="mobile-menu-panel">
            <div className="mb-8 flex items-center justify-between">
              <div className="brand-mark">
                <SnowflakeIcon className="size-8" />
                <span>
                  <strong>لانچ‌اوکس</strong>
                  <small>نمایشگاه سرمایش</small>
                </span>
              </div>
              <span className="text-xs text-muted">منوی فروشگاه</span>
            </div>
            <form action="/search" className="header-search mb-6 flex w-full">
              <SearchIcon className="size-5 shrink-0" />
              <input
                type="search"
                name="q"
                aria-label="جستجو"
                placeholder="جستجوی یخچال..."
              />
            </form>
            <nav className="grid gap-2" aria-label="ناوبری موبایل">
              {mainLinks.map((link) =>
                link.href ? (
                  <Link
                    key={link.label}
                    href={link.href}
                    aria-current={pathname === link.href ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <span
                    key={link.label}
                    className={styles.mobilePlaceholder}
                    aria-disabled="true"
                  >
                    {link.label}
                  </span>
                ),
              )}
              <Link href="/login">ورود / حساب کاربری</Link>
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
};
