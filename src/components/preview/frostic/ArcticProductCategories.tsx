"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./ArcticProductCategories.module.css";

interface ProductCategory {
  id: string;
  title: string;
  image: string;
  href?: string;
}

const categories: readonly ProductCategory[] = [
  {
    id: "twin",
    title: "یخچال فریزر دوقلو",
    image: "/images/preview/categories/twin.png",
  },
  {
    id: "french-door",
    title: "یخچال فرنچ دور",
    image: "/images/preview/categories/french-door.png",
    href: "/categories/clothing",
  },
  {
    id: "top-freezer",
    title: "یخچال بالا پایین",
    image: "/images/preview/categories/top-freezer.png",
    href: "/categories/home-kitchen",
  },
  {
    id: "bottom-freezer",
    title: "یخچال بالا پایین",
    image: "/images/preview/categories/bottom-freezer.png",
    href: "/categories/home-kitchen",
  },
  {
    id: "side-by-side",
    title: "یخچال ساید بای ساید",
    image: "/images/preview/categories/side-by-side.png",
    href: "/categories/digital",
  },
  {
    id: "combi",
    title: "کمبی",
    image: "/images/preview/categories/combi.png",
    href: "/categories/home-kitchen",
  },
  {
    id: "mini",
    title: "یخچال هتلی و مینی",
    image: "/images/preview/categories/mini.png",
    href: "/categories/books",
  },
  {
    id: "commercial",
    title: "یخچال فروشگاهی",
    image: "/images/preview/categories/commercial.png",
  },
];

export function ArcticProductCategories() {
  const rowRef = useRef<HTMLDivElement>(null);
  const [navigation, setNavigation] = useState({
    overflowing: false,
    previous: false,
    next: false,
  });
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    function updateNavigation() {
      if (!row) return;
      const overflow = row.scrollWidth - row.clientWidth;
      const position = Math.abs(row.scrollLeft);
      setNavigation({
        overflowing: overflow > 1,
        previous: overflow > 1 && position > 1,
        next: overflow > 1 && position < overflow - 1,
      });
    }

    function handleWheel(event: WheelEvent) {
      if (
        !row ||
        event.ctrlKey ||
        event.shiftKey ||
        Math.abs(event.deltaX) >= Math.abs(event.deltaY)
      )
        return;
      const delta =
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? row.clientWidth
            : 1);
      const position = Math.abs(row.scrollLeft);
      const remaining = row.scrollWidth - row.clientWidth - position;
      if ((delta > 0 && remaining > 1) || (delta < 0 && position > 1)) {
        event.preventDefault();
        row.scrollLeft -= delta;
      }
    }

    function updateLayout() {
      if (!row) return;
      const minimumWidth = Number.parseFloat(
        getComputedStyle(row).getPropertyValue("--category-min-width"),
      );
      const gap = 4;
      const visibleCount = Math.max(
        1,
        Math.min(
          categories.length,
          Math.floor((row.clientWidth + gap) / (minimumWidth + gap)),
        ),
      );
      const availableWidth =
        (row.clientWidth - gap * (visibleCount - 1)) / visibleCount;
      const cardWidth =
        visibleCount === categories.length
          ? Math.min(150, availableWidth)
          : availableWidth;
      row.style.setProperty("--category-width", `${cardWidth}px`);
      updateNavigation();
    }

    const observer = new ResizeObserver(updateLayout);
    observer.observe(row);
    row.addEventListener("scroll", updateNavigation);
    row.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      observer.disconnect();
      row.removeEventListener("scroll", updateNavigation);
      row.removeEventListener("wheel", handleWheel);
    };
  }, []);

  function scrollCategories(direction: "previous" | "next") {
    const row = rowRef.current;
    if (!row) return;
    row.scrollBy({
      left: (row.clientWidth + 4) * (direction === "next" ? -1 : 1),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }

  return (
    <section
      className={`${styles.placement} mx-auto w-full max-w-[1560px] px-5 sm:px-8`}
      dir="rtl"
      aria-labelledby="arctic-categories-title"
      data-arctic-categories
    >
      <div className={styles.panel}>
        <div className={styles.heading}>
          <h2 id="arctic-categories-title">دسته‌بندی محصولات</h2>
          {categories.length > 9 && (
            <Link href="/products" className={styles.viewAll}>
              دیدن همه
              <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
            </Link>
          )}
        </div>
        <div className={styles.track}>
          {navigation.overflowing && (
            <>
              <button
                type="button"
                className={`${styles.scrollButton} ${styles.previous}`}
                aria-label="دسته‌بندی‌های قبلی"
                aria-controls="arctic-categories-row"
                disabled={!navigation.previous}
                onClick={() => scrollCategories("previous")}
              >
                <ChevronRight size={20} strokeWidth={1.8} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`${styles.scrollButton} ${styles.next}`}
                aria-label="دسته‌بندی‌های بعدی"
                aria-controls="arctic-categories-row"
                disabled={!navigation.next}
                onClick={() => scrollCategories("next")}
              >
                <ChevronLeft size={20} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </>
          )}
          <div
            id="arctic-categories-row"
            ref={rowRef}
            className={styles.row}
            role="region"
            aria-label="دسته‌بندی‌ها؛ برای مشاهده همه موارد، افقی پیمایش کنید"
            tabIndex={0}
          >
            <ul className={styles.list}>
              {categories.map((category) => {
                const content = (
                  <>
                    <div className={styles.image}>
                      <Image
                        src={category.image}
                        alt={`نمای نمونهٔ ${category.title}`}
                        width={120}
                        height={115}
                        sizes="(max-width: 767px) 98px, (max-width: 1023px) 113px, 128px"
                      />
                    </div>
                    <span className={styles.title}>{category.title}</span>
                  </>
                );

                return (
                  <li key={category.id} className={styles.item}>
                    {category.href ? (
                      <Link href={category.href} className={styles.card}>
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={styles.card}
                        disabled
                        title="مسیر این دسته‌بندی هنوز فعال نشده است"
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
