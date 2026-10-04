"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="ناوبری مدیریت" className="admin-navigation">
      <Link
        href="/admin"
        aria-current={pathname === "/admin" ? "page" : undefined}
      >
        نمای کلی
      </Link>
      <Link
        href="/admin/products"
        aria-current={
          pathname.startsWith("/admin/products") ? "page" : undefined
        }
      >
        محصولات
      </Link>
      <Link
        href="/admin/categories"
        aria-current={
          pathname.startsWith("/admin/categories") ? "page" : undefined
        }
      >
        دسته‌بندی‌ها
      </Link>
      <Link
        href="/admin/orders"
        aria-current={pathname.startsWith("/admin/orders") ? "page" : undefined}
      >
        سفارش‌ها
      </Link>
      <Link
        href="/admin/users"
        aria-current={pathname.startsWith("/admin/users") ? "page" : undefined}
      >
        کاربران
      </Link>
    </nav>
  );
}
