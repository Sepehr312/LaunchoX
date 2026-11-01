"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  ShoppingBag,
  Users,
  Menu,
  X,
  Snowflake,
  ArrowUpLeft,
} from "lucide-react";
import { useRef, type ReactNode } from "react";
const links = [
  { href: "/admin", label: "نمای کلی", icon: LayoutDashboard },
  { href: "/admin/products", label: "محصولات", icon: Package },
  { href: "/admin/categories", label: "دسته‌بندی‌ها", icon: FolderTree },
  { href: "/admin/brands", label: "برندها", icon: Tags },
  { href: "/admin/orders", label: "سفارش‌ها", icon: ShoppingBag },
  { href: "/admin/users", label: "کاربران", icon: Users },
];
export function AdminNavigation({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const navigation = (close = false) => (
    <nav aria-label="ناوبری مدیریت" className="admin-navigation">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            (href === "/admin" ? pathname === href : pathname.startsWith(href))
              ? "page"
              : undefined
          }
          onClick={() => {
            if (close) dialog.current?.close();
          }}
        >
          <Icon size={21} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
  return (
    <>
      <div className="admin-desktop-nav">{navigation()}</div>
      <button
        type="button"
        className="admin-menu-trigger"
        ref={trigger}
        onClick={() => dialog.current?.showModal()}
        aria-haspopup="dialog"
        aria-controls="admin-mobile-menu"
        aria-label="باز کردن منوی مدیریت"
      >
        <Menu size={22} aria-hidden="true" />
      </button>
      <dialog
        id="admin-mobile-menu"
        className="admin-drawer"
        ref={dialog}
        aria-label="منوی مدیریت"
        onClose={() => trigger.current?.focus()}
      >
        <div className="admin-drawer-header">
          <Snowflake aria-hidden="true" />
          <strong>مدیریت لانچ‌اوکس</strong>
          <button
            autoFocus
            aria-label="بستن منو"
            onClick={() => dialog.current?.close()}
          >
            <X size={22} />
          </button>
        </div>
        {navigation(true)}
        <div className="mt-6">{children}</div>
        <Link
          className="admin-store-link"
          href="/"
          onClick={() => dialog.current?.close()}
        >
          مشاهده فروشگاه <ArrowUpLeft size={18} aria-hidden="true" />
        </Link>
      </dialog>
    </>
  );
}
