"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { GitCompareArrows } from "lucide-react";
import { COMPARE_PRODUCT_LIMIT, parseCompareIds } from "@/validations/compare";
import {
  comparisonHref,
  readComparisonSelection,
  subscribeComparisonSelection,
} from "./comparison-selection";
import styles from "./compare-entry.module.css";

export function CompareProductButton({
  id,
  title,
  iconOnly = false,
}: {
  id: string;
  title: string;
  iconOnly?: boolean;
}) {
  const saved = useSyncExternalStore(
    subscribeComparisonSelection,
    readComparisonSelection,
    () => "",
  );
  const [full, setFull] = useState(false);
  const normalizedId = parseCompareIds(id)[0];
  if (!normalizedId) return null;
  const selected = parseCompareIds(saved);
  const exists = selected.includes(normalizedId);
  const next = exists ? selected : [...selected, normalizedId];
  return (
    <div className={`${styles.entry} ${iconOnly ? styles.iconEntry : ""}`}>
      <Link
        href={comparisonHref(
          next.length <= COMPARE_PRODUCT_LIMIT ? next : selected,
        )}
        prefetch={false}
        className={`${styles.link} ${iconOnly ? styles.iconLink : ""}`}
        aria-label={`مقایسه ${title}`}
        title={`مقایسه ${title}`}
        onClick={(event) => {
          if (!exists && selected.length >= COMPARE_PRODUCT_LIMIT) {
            event.preventDefault();
            setFull(true);
          }
        }}
      >
        <GitCompareArrows size={16} aria-hidden="true" />
        {!iconOnly && (
          <span>{exists ? "مشاهده در مقایسه" : "مقایسه محصول"}</span>
        )}
      </Link>
      {full && (
        <p role="status" className={styles.message}>
          حداکثر چهار محصول قابل مقایسه است.{" "}
          <Link href={comparisonHref(selected)}>مدیریت مقایسه</Link>
        </p>
      )}
    </div>
  );
}
