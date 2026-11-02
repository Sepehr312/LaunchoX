"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/components/customer/dashboard.module.css";

export function DashboardBreadcrumb() {
  const pathname = usePathname();
  const title = pathname.startsWith("/account/orders/")
    ? "جزئیات سفارش"
    : pathname === "/account/orders"
      ? "سفارش‌های من"
      : pathname === "/account/addresses"
        ? "آدرس‌های من"
        : pathname === "/account/profile"
          ? "پروفایل و امنیت"
          : "داشبورد";
  return (
    <nav aria-label="مسیر صفحه" className={styles.breadcrumb}>
      <Link href="/account">حساب کاربری</Link>
      <span aria-hidden="true"> / </span>
      <span aria-current="page">{title}</span>
    </nav>
  );
}
