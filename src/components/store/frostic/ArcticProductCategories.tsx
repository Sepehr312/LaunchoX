"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Snowflake } from "lucide-react";
import type { CategoryDTO } from "@/types/dto";
import styles from "./ArcticProductCategories.module.css";

export function ArcticProductCategories({
  categories,
}: {
  categories: CategoryDTO[];
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [categoryLimit, setCategoryLimit] = useState(8);
  const displayedCategories = categories.slice(0, categoryLimit);
  const displayedCount = displayedCategories.length;
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
      // Keep extra cards within the original panel, allowing a readable card width.
      setCategoryLimit(Math.max(8, Math.floor((row.clientWidth + 16) / 151)));
      const minimumWidth = Number.parseFloat(
        getComputedStyle(row).getPropertyValue("--category-min-width"),
      );
      const gap = 4;
      const visibleCount = Math.max(
        1,
        Math.min(
          displayedCount,
          Math.floor((row.clientWidth + gap) / (minimumWidth + gap)),
        ),
      );
      const availableWidth =
        (row.clientWidth - gap * (visibleCount - 1)) / visibleCount;
      const cardWidth =
        visibleCount === displayedCount
          ? Math.min(150, availableWidth)
          : availableWidth;
      row.style.setProperty("--category-width", `${cardWidth}px`);
      const cardGap =
        visibleCount === displayedCount && displayedCount > 1
          ? Math.min(
              16,
              Math.max(
                gap,
                (row.clientWidth - cardWidth * displayedCount) /
                  (displayedCount - 1),
              ),
            )
          : gap;
      row.style.setProperty("--category-gap", `${cardGap}px`);
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
  }, [displayedCount]);

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
      id="categories"
      className={`${styles.placement} mx-auto w-full max-w-[1560px] scroll-mt-24 px-5 sm:px-8`}
      dir="rtl"
      aria-labelledby="arctic-categories-title"
      data-arctic-categories
    >
      <div className={styles.panel}>
        <div className={styles.heading}>
          <h2 id="arctic-categories-title">دسته‌بندی محصولات</h2>
          {categories.length >= 8 && (
            <Link href="/categories" className={styles.viewAll}>
              مشاهده همه
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
            {categories.length === 0 ? (
              <p className="py-6 text-center text-muted">
                هنوز دسته‌بندی‌ای برای نمایش وجود ندارد.
              </p>
            ) : (
              <ul className={styles.list}>
                {displayedCategories.map((category) => {
                  const image = category.image;
                  const content = (
                    <>
                      <div className={styles.image}>
                        {image ? (
                          <Image
                            src={image}
                            alt={`نمای نمونهٔ ${category.name}`}
                            width={120}
                            height={115}
                            sizes="(max-width: 767px) 98px, (max-width: 1023px) 113px, 128px"
                          />
                        ) : (
                          <Snowflake size={56} aria-hidden="true" />
                        )}
                      </div>
                      <span className={styles.title}>{category.name}</span>
                    </>
                  );

                  return (
                    <li key={category.id} className={styles.item}>
                      <Link
                        href={`/categories/${encodeURIComponent(category.slug)}`}
                        className={styles.card}
                      >
                        {content}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
