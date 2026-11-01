"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Search, X, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { searchCompareAction } from "@/actions/compare.actions";
import {
  COMPARE_PRODUCT_LIMIT,
  compareSearchSchema,
} from "@/validations/compare";
import { formatPrice, toPersianDigits } from "@/lib/format";
import type { CompareProductDTO } from "@/types/dto";
import { getCompareAttribute } from "./compare-data";
import styles from "./compare.module.css";

export function CompareProductPicker({
  selected,
  onAdd,
  onClose,
  fixtures,
}: {
  selected: string[];
  onAdd: (product: CompareProductDTO) => void;
  onClose: () => void;
  fixtures?: CompareProductDTO[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    items: CompareProductDTO[];
    totalPages: number;
  }>({ items: [], totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const input = compareSearchSchema.parse({ q: query, page });
        const data = fixtures
          ? {
              items: fixtures.filter((product) =>
                `${product.title} ${getCompareAttribute(product, "برند")}`.includes(
                  input.q,
                ),
              ),
              totalPages: 1,
            }
          : await searchCompareAction(input);
        if (active) setResult(data);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, page, retry, fixtures]);

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="compare-picker-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.dialogHead}>
        <div>
          <h2 id="compare-picker-title">افزودن محصول به مقایسه</h2>
          <p>بر اساس نام محصول یا برند جست‌وجو کن.</p>
        </div>
        <button
          className={styles.iconButton}
          onClick={onClose}
          aria-label="بستن انتخاب محصولات"
        >
          <X size={20} />
        </button>
      </div>
      <label className={styles.search}>
        <Search size={20} />
        <span className="sr-only">جست‌وجوی نام محصول یا برند</span>
        <input
          autoFocus
          maxLength={100}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
            setLoading(true);
          }}
          placeholder="نام محصول یا برند…"
        />
      </label>
      <p role="status" className={styles.hint}>
        {selected.length >= COMPARE_PRODUCT_LIMIT
          ? "ظرفیت مقایسه تکمیل است؛ ابتدا یکی از محصولات را حذف کن."
          : `${toPersianDigits(selected.length)} از ${toPersianDigits(COMPARE_PRODUCT_LIMIT)} محصول انتخاب شده`}
      </p>
      <div className={styles.pickerResults} aria-busy={loading}>
        {loading ? (
          <p role="status">در حال جست‌وجوی محصولات…</p>
        ) : error ? (
          <div role="alert">
            <p>دریافت محصولات انجام نشد.</p>
            <Button onClick={() => setRetry(retry + 1)}>تلاش مجدد</Button>
          </div>
        ) : result.items.length === 0 ? (
          <p>محصولی با این نام یا برند پیدا نشد.</p>
        ) : (
          result.items.map((product) => {
            const exists = selected.includes(product.id);
            return (
              <div key={product.id} className={styles.pickerRow}>
                <Image
                  src={product.images[0]}
                  alt=""
                  width={48}
                  height={64}
                  className={styles.thumbnail}
                />
                <div>
                  <strong>{toPersianDigits(product.title)}</strong>
                  <p>{formatPrice(product.price)}</p>
                </div>
                <button
                  className={styles.iconButton}
                  disabled={exists || selected.length >= COMPARE_PRODUCT_LIMIT}
                  onClick={() => onAdd(product)}
                  aria-label={
                    exists
                      ? `انتخاب شده: ${product.title}`
                      : `افزودن ${product.title}`
                  }
                >
                  {exists ? <Check size={20} /> : <Plus size={20} />}
                </button>
              </div>
            );
          })
        )}
      </div>
      {!loading && !error && result.totalPages > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => {
              setPage(page - 1);
              setLoading(true);
            }}
          >
            قبلی
          </Button>
          <span>
            {toPersianDigits(page)} / {toPersianDigits(result.totalPages)}
          </span>
          <Button
            variant="secondary"
            disabled={page === result.totalPages}
            onClick={() => {
              setPage(page + 1);
              setLoading(true);
            }}
          >
            بعدی
          </Button>
        </div>
      )}
    </dialog>
  );
}
