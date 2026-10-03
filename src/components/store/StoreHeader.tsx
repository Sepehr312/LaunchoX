import Link from "next/link";
import type { CategoryDTO } from "@/types/dto";
import {
  MenuIcon,
  SearchIcon,
  SnowflakeIcon,
  UserIcon,
} from "@/components/store/Icons";

const mainLinks = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/products", label: "همه محصولات" },
  { href: "/search", label: "جستجو" },
];

export function StoreHeader({ categories }: { categories: CategoryDTO[] }) {
  return (
    <header className="store-header">
      <div className="store-shell flex h-18 items-center gap-3 lg:h-21">
        <Link href="/" className="brand-mark shrink-0" aria-label="لانچ‌اوکس">
          <SnowflakeIcon className="size-9" />
          <span>
            <strong>لانچ‌اوکس</strong>
            <small>سرمای مطمئن، انتخاب دقیق</small>
          </span>
        </Link>

        <nav
          className="hidden flex-1 items-center justify-center gap-7 lg:flex"
          aria-label="ناوبری اصلی"
        >
          {mainLinks.map((link) => (
            <Link key={link.href} href={link.href} className="header-link">
              {link.label}
            </Link>
          ))}
          {categories.slice(0, 3).map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="header-link"
            >
              {category.name}
            </Link>
          ))}
        </nav>

        <form action="/search" className="header-search hidden xl:flex">
          <SearchIcon className="size-5 shrink-0" />
          <input
            type="search"
            name="q"
            aria-label="جستجو در محصولات"
            placeholder="مدل، برند یا ظرفیت..."
          />
        </form>

        <Link href="/login" className="header-action hidden sm:inline-flex">
          <UserIcon className="size-5" />
          <span>ورود / حساب</span>
        </Link>

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
              {mainLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
              {categories.map((category) => (
                <Link key={category.id} href={`/categories/${category.slug}`}>
                  {category.name}
                </Link>
              ))}
              <Link href="/login">ورود / حساب کاربری</Link>
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}
