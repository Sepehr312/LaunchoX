"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserIcon, TruckIcon, ControlIcon } from "@/components/store/Icons";
import styles from "@/components/customer/customer.module.css";
export function CustomerNavigation() {
  const pathname = usePathname();
  return (
    <nav className={styles.navigation} aria-label="حساب کاربری">
      {[
        { href: "/account", label: "پروفایل و امنیت", Icon: UserIcon },
        { href: "/account/addresses", label: "آدرس‌های من", Icon: ControlIcon },
        { href: "/account/orders", label: "سفارش‌های من", Icon: TruckIcon },
      ].map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            (
              href === "/account"
                ? pathname === href
                : pathname.startsWith(href)
            )
              ? "page"
              : undefined
          }
        >
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  );
}
