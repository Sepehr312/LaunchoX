"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { GitCompareArrows } from "lucide-react";
import { parseCompareIds } from "@/validations/compare";
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
  if (!parseCompareIds(id).length) return null;
  const selected = parseCompareIds(saved);
  const exists = selected.includes(id);
  const next = exists ? selected : [...selected, id];
  return (
    <div className={`${styles.entry} ${iconOnly ? styles.iconEntry : ""}`}>
      <Link
        href={comparisonHref(next.length <= 4 ? next : selected)}
        prefetch={false}
        className={`${styles.link} ${iconOnly ? styles.iconLink : ""}`}
        aria-label={`مقایسه ${title}`}
        title={`مقایسه ${title}`}
        onClick={(event) => {
          if (!exists && selected.length === 4) {
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
