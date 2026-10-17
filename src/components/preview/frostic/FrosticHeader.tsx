"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  CartIcon,
  MenuIcon,
  SearchIcon,
  SnowflakeIcon,
  UserIcon,
} from "@/components/store/Icons";
import { toPersianDigits } from "@/lib/format";
import { FrosticIcon } from "./FrosticIcons";
import type { FrosticTheme } from "./use-preview-theme";
import themeStyles from "./frostic-theme.module.css";
import styles from "./FrosticHeader.module.css";

export interface FrosticNavItem {
  label: string;
  href?: string;
}
const defaultLinks: readonly FrosticNavItem[] = [
  { label: "خانه", href: "/" },
  { label: "محصولات", href: "/products" },
  { label: "برندها", href: "/brands" },
  { label: "مقایسه" },
  { label: "مجله خرید" },
  { label: "خدمات" },
  { label: "درباره ما", href: "/about" },
];

function Brand() {
  return (
    <Link href="/" className={styles.brand} aria-label="لانچ‌اوکس، خانه">
      <SnowflakeIcon className={styles.snowflake} />
      <span lang="en" dir="ltr">
        LaunchoX
      </span>
    </Link>
  );
}

function SearchForm({ mobile = false }: { mobile?: boolean }) {
  return (
    <form role="search" action="/search" className={styles.search}>
      <input
        autoFocus={mobile}
        type="search"
        name="q"
        maxLength={200}
        aria-label="جستجوی یخچال، برند یا مدل"
        placeholder="جستجوی یخچال، برند یا مدل..."
      />
      <button type="submit" aria-label="جستجو">
        <SearchIcon />
      </button>
    </form>
  );
}

export function FrosticHeader({
  cartCount = 0,
  authenticated = false,
  links = defaultLinks,
  activeHref,
  theme = "system",
}: {
  cartCount?: number;
  authenticated?: boolean;
  links?: readonly FrosticNavItem[];
  activeHref?: string;
  theme?: FrosticTheme;
}) {
  const pathname = usePathname();
  const selectedHref = activeHref ?? pathname;
  const dialogId = useId();
  const inlineSearchId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const inlineSearch = useRef<HTMLDivElement>(null);
  const inlineSearchTrigger = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [panel, setPanel] = useState<"menu" | "search">("menu");
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const count = toPersianDigits(Math.max(0, Math.floor(cartCount)));
  const badgeCount = cartCount > 99 ? `${toPersianDigits(99)}+` : count;

  useEffect(() => {
    if (!isSearchExpanded) return;
    const container = inlineSearch.current;
    container
      ?.querySelector<HTMLInputElement>("input")
      ?.focus({ preventScroll: true });
    function handleOutside(event: PointerEvent) {
      if (event.target instanceof Node && !container?.contains(event.target))
        setIsSearchExpanded(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        event.target instanceof Node &&
        container?.contains(event.target)
      ) {
        event.preventDefault();
        setIsSearchExpanded(false);
        inlineSearchTrigger.current?.focus();
      }
    }
    function handleFocusOutside(event: FocusEvent) {
      if (event.target instanceof Node && !container?.contains(event.target))
        setIsSearchExpanded(false);
    }
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("focusin", handleFocusOutside);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("focusin", handleFocusOutside);
    };
  }, [isSearchExpanded]);

  useEffect(() => {
    if (!isOpen) return;
    const element = dialog.current;
    element?.showModal();
    if (panel === "search")
      element?.querySelector<HTMLInputElement>("input")?.focus();
    function trapFocus(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        return;
      }
      if (event.key !== "Tab" || !element) return;
      const controls = Array.from(
        element.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((control) => control.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    element?.addEventListener("keydown", trapFocus);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      element?.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = previousOverflow;
      opener.current?.focus();
    };
  }, [isOpen, panel]);

  useEffect(() => {
    const media = matchMedia("(min-width: 1280px)");
    const closeOnDesktop = () => {
      if (media.matches) setIsOpen(false);
      else setIsSearchExpanded(false);
    };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);

  function openPanel(value: "menu" | "search", button: HTMLButtonElement) {
    opener.current = button;
    setPanel(value);
    setIsOpen(true);
  }

  function navigation(mobile = false) {
    return (
      <nav
        aria-label={mobile ? "منوی اصلی موبایل" : "منوی اصلی"}
        className={mobile ? styles.drawerNav : styles.navigation}
      >
        {links.map((item) =>
          item.href ? (
            <Link
              key={item.label}
              href={item.href}
              aria-current={
                selectedHref === item.href ||
                (item.href === "/brands" &&
                  selectedHref?.startsWith("/brands/"))
                  ? "page"
                  : undefined
              }
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ) : (
            <span
              key={item.label}
              aria-disabled="true"
              title="این بخش هنوز فعال نشده است"
            >
              {item.label}
              {mobile && <small>به‌زودی</small>}
            </span>
          ),
        )}
      </nav>
    );
  }

  return (
    <header
      className={`${themeStyles.theme} ${styles.header}`}
      data-theme={theme}
      data-frostic-header
    >
      <div className={styles.bar}>
        <div className={styles.actions}>
          <Link
            href="/cart"
            className={`${styles.iconButton} ${styles.cart}`}
            aria-label={`سبد خرید، ${count} کالا`}
          >
            <CartIcon />
            {cartCount > 0 && (
              <span className={styles.badge} aria-hidden="true" data-cart-count>
                <bdi dir="ltr">{badgeCount}</bdi>
              </span>
            )}
          </Link>
          <Link
            href={authenticated ? "/account" : "/login"}
            className={`${styles.iconButton} ${styles.desktopOnly}`}
            aria-label="حساب کاربری"
          >
            <UserIcon />
          </Link>
          <div
            ref={inlineSearch}
            className={`${styles.desktopOnly} ${styles.inlineSearchControl}`}
            data-expanded={isSearchExpanded}
          >
            <button
              ref={inlineSearchTrigger}
              type="button"
              className={styles.iconButton}
              aria-label={isSearchExpanded ? "بستن جستجو" : "باز کردن جستجو"}
              aria-controls={inlineSearchId}
              aria-expanded={isSearchExpanded}
              onClick={() => setIsSearchExpanded((expanded) => !expanded)}
            >
              {isSearchExpanded ? <FrosticIcon name="close" /> : <SearchIcon />}
            </button>
            <div
              id={inlineSearchId}
              className={styles.inlineSearch}
              inert={!isSearchExpanded}
              aria-hidden={!isSearchExpanded}
            >
              <SearchForm />
            </div>
          </div>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.compactOnly}`}
            aria-label="باز کردن جستجو"
            aria-haspopup="dialog"
            aria-controls={dialogId}
            aria-expanded={isOpen && panel === "search"}
            onClick={(event) => openPanel("search", event.currentTarget)}
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.compactOnly}`}
            aria-label="باز کردن منو"
            aria-haspopup="dialog"
            aria-controls={dialogId}
            aria-expanded={isOpen && panel === "menu"}
            onClick={(event) => openPanel("menu", event.currentTarget)}
          >
            <MenuIcon />
          </button>
        </div>
        {navigation()}
        <Brand />
      </div>
      <dialog
        ref={dialog}
        id={dialogId}
        className={`${styles.dialog} ${panel === "search" ? styles.searchDialog : styles.drawer}`}
        aria-labelledby={`${dialogId}-title`}
        aria-modal="true"
        onCancel={(event) => {
          event.preventDefault();
          setIsOpen(false);
        }}
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < rect.x ||
              event.clientX > rect.x + rect.width ||
              event.clientY < rect.y ||
              event.clientY > rect.y + rect.height
            )
              setIsOpen(false);
          }
        }}
      >
        <>
          <div className={styles.dialogHeading}>
            <h2 id={`${dialogId}-title`}>
              {panel === "menu" ? "منوی فروشگاه" : "چه یخچالی در ذهن دارید؟"}
            </h2>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="بستن"
              onClick={() => setIsOpen(false)}
            >
              <FrosticIcon name="close" />
            </button>
          </div>
          {panel === "menu" ? (
            <>
              <Brand />
              {navigation(true)}
              <div className={styles.drawerBottom}>
                <Link
                  href={authenticated ? "/account" : "/login"}
                  className={styles.accountLink}
                >
                  <UserIcon />
                  حساب کاربری
                  <FrosticIcon name="arrow" />
                </Link>
                <p className={styles.drawerNote}>
                  لانچ‌اوکس؛ انتخابی برای سال‌های پیش رو.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className={styles.searchHint}>
                نام مدل، برند یا نوع یخچال را جستجو کنید.
              </p>
              <SearchForm mobile />
              <p className={styles.searchHint}>
                مثلاً ساید بای ساید یا یخچال فریزر
              </p>
            </>
          )}
        </>
      </dialog>
    </header>
  );
}
