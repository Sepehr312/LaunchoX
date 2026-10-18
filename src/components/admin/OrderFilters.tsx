"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  orderStatuses,
  paymentStatuses,
  type OrderStatus,
} from "@/types/domain";
import { orderLabels, paymentLabels } from "@/types/order-labels";
import { toPersianDigits } from "@/lib/format";
import type { AdminOrderQuery } from "@/validations/order";
import styles from "@/components/admin/Orders.module.css";

type Filters = { q: string; status: string; payment: string; period: string };

export function OrderFilters({
  query,
  counts,
}: {
  query: AdminOrderQuery;
  counts: Record<OrderStatus, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [filters, setFilters] = useState<Filters>({
    q: query.q,
    status: query.status ?? "",
    payment: query.payment ?? "",
    period: query.period ?? "",
  });
  const draft = useRef(filters);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const composing = useRef(false);
  const ownNavigations = useRef(new Set<string>());
  const [pending, startTransition] = useTransition();
  const serialized = params.toString();

  useEffect(() => {
    // Ignore our own responses so an older response cannot erase newer typing.
    if (ownNavigations.current.delete(serialized)) return;
    clearTimeout(timer.current);
    const current = new URLSearchParams(serialized);
    const next = {
      q: current.get("q") ?? "",
      status: current.get("status") ?? "",
      payment: current.get("payment") ?? "",
      period: current.get("period") ?? "",
    };
    draft.current = next;
    setFilters(next);
  }, [serialized]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function navigate(next: Filters) {
    const updated = new URLSearchParams(serialized);
    for (const [key, value] of Object.entries(next)) {
      if (value.trim()) updated.set(key, value.trim());
      else updated.delete(key);
    }
    updated.delete("page");
    if (updated.toString() === serialized) return;
    ownNavigations.current.add(updated.toString());
    startTransition(() =>
      router.replace(`${pathname}${updated.size ? `?${updated}` : ""}`, {
        scroll: false,
      }),
    );
  }

  function change(key: keyof Filters, value: string, delayed = false) {
    const next = { ...draft.current, [key]: value };
    draft.current = next;
    setFilters(next);
    clearTimeout(timer.current);
    if (delayed) {
      if (!composing.current)
        timer.current = setTimeout(() => navigate(next), 300);
    } else navigate(next);
  }

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return (
    <div className={styles.filters}>
      <nav className={styles.tabs} aria-label="فیلتر وضعیت سفارش">
        {[
          { value: "", label: "همه سفارش‌ها", count: total },
          ...orderStatuses.map((status) => ({
            value: status,
            label: orderLabels[status],
            count: counts[status],
          })),
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-pressed={filters.status === tab.value}
            className={styles.tab}
            onClick={() => change("status", tab.value)}
          >
            {tab.label}
            <span>{toPersianDigits(tab.count)}</span>
          </button>
        ))}
      </nav>
      <div
        className={styles.controls}
        role="search"
        aria-label="جستجو و فیلتر سفارش‌ها"
      >
        <label className={styles.search}>
          <span>جستجوی سفارش</span>
          <span className={styles.searchInput}>
            <Search size={20} aria-hidden="true" />
            <input
              name="q"
              type="search"
              value={filters.q}
              maxLength={100}
              placeholder="شماره سفارش یا نام مشتری…"
              onChange={(event) => change("q", event.target.value, true)}
              onCompositionStart={() => {
                composing.current = true;
                clearTimeout(timer.current);
              }}
              onCompositionEnd={(event) => {
                composing.current = false;
                change("q", event.currentTarget.value, true);
              }}
            />
          </span>
        </label>
        <label>
          <span id="order-payment-label">وضعیت پرداخت</span>
          <select
            name="payment"
            aria-labelledby="order-payment-label"
            className="field-input"
            value={filters.payment}
            onChange={(event) => change("payment", event.target.value)}
          >
            <option value="">همه وضعیت‌ها</option>
            {paymentStatuses.map((status) => (
              <option key={status} value={status}>
                {paymentLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span id="order-period-label">بازه زمانی</span>
          <select
            name="period"
            aria-labelledby="order-period-label"
            className="field-input"
            value={filters.period}
            onChange={(event) => change("period", event.target.value)}
          >
            <option value="">همه زمان‌ها</option>
            {[7, 30, 90].map((days) => (
              <option key={days} value={days}>
                {toPersianDigits(days)} روز گذشته
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className={styles.liveStatus} role="status" aria-live="polite">
        {pending ? "در حال به‌روزرسانی نتایج…" : ""}
      </p>
    </div>
  );
}
