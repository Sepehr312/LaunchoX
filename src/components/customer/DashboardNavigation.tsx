"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid,
  ClipboardList,
  MapPin,
  ShieldCheck,
  LogOut,
  Menu,
  UserRound,
} from "lucide-react";
import { logoutAction } from "@/actions/auth.actions";
import styles from "@/components/customer/dashboard.module.css";

export function DashboardNavigation({ name }: { name: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className={styles.menuButton}
        type="button"
        aria-expanded={open}
        aria-controls="dashboard-navigation"
        onClick={() => setOpen(!open)}
      >
        <Menu size={18} /> منوی حساب
      </button>
      <aside
        className={styles.sidebar}
        id="dashboard-navigation"
        data-open={open}
      >
        <div className={styles.identity}>
          <span className={styles.avatar}>
            <UserRound size={32} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <strong>{name}</strong>
          <small>حساب مشتری</small>
        </div>
        <nav aria-label="منوی حساب مشتری">
          {[
            { href: "/account", label: "داشبورد", Icon: LayoutGrid },
            {
              href: "/account/orders",
              label: "سفارش‌های من",
              Icon: ClipboardList,
            },
            { href: "/account/addresses", label: "آدرس‌های من", Icon: MapPin },
            {
              href: "/account/profile",
              label: "پروفایل و امنیت",
              Icon: ShieldCheck,
            },
          ].map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                (
                  href === "/account"
                    ? pathname === href
                    : pathname === href || pathname.startsWith(`${href}/`)
                )
                  ? "page"
                  : undefined
              }
              onClick={() => setOpen(false)}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction}>
          <button type="submit">
            <LogOut size={20} />
            خروج از حساب
          </button>
        </form>
      </aside>
    </>
  );
}
