"use client";

import { useState } from "react";
import { formatNumber } from "@/lib/format";
import type { RealtimeAnalyticsReport } from "@/types/analytics";
import styles from "@/components/admin/AnalyticsDashboard.module.css";

type Minutes = RealtimeAnalyticsReport["minutes"];
function minuteLabel(value: number) {
  return value === 0 ? "دقیقهٔ جاری" : `${formatNumber(value)} دقیقه قبل`;
}

function MinutePlot({
  minutes,
  selected,
  select,
  compact = false,
}: {
  minutes: Minutes;
  selected?: number;
  select: (value: number) => void;
  compact?: boolean;
}) {
  const width = compact ? 340 : 1000;
  const start = compact ? 30 : 42;
  const end = width - 18;
  const bottom = 204;
  const step = Math.max(
    1,
    Math.ceil(Math.max(0, ...minutes.map((item) => item.activeUsers)) / 4),
  );
  const levels = Math.max(
    1,
    Math.ceil(Math.max(0, ...minutes.map((item) => item.activeUsers)) / step),
  );
  const maximum = step * levels;
  const slot = (end - start) / 30;
  const x = (index: number) => start + (index + 0.5) * slot;
  const y = (value: number) => bottom - (value / maximum) * 160;
  return (
    <svg
      viewBox={`0 0 ${width} 248`}
      role="group"
      aria-label="نمودار کاربران فعال در هر دقیقه؛ زمان روی محور افقی و تعداد کاربران روی محور عمودی"
    >
      {Array.from({ length: levels + 1 }, (_, tick) => (
        <g key={tick} aria-hidden="true">
          <line
            x1={start}
            x2={end}
            y1={y(tick * step)}
            y2={y(tick * step)}
            stroke="#e3edf8"
            strokeDasharray={tick === 0 ? undefined : "3 5"}
          />
          <text
            x={start - 10}
            y={y(tick * step) + 4}
            textAnchor="end"
            fill="#7c8da8"
            fontSize={11}
          >
            {formatNumber(tick * step)}
          </text>
        </g>
      ))}
      {minutes.map((minute, index) => (
        <g
          key={minute.minutesAgo}
          role="button"
          tabIndex={0}
          aria-label={`${minuteLabel(minute.minutesAgo)}: ${formatNumber(minute.activeUsers)} کاربر فعال`}
          aria-pressed={selected === minute.minutesAgo}
          className={styles.minuteTarget}
          onPointerEnter={() => select(minute.minutesAgo)}
          onFocus={() => select(minute.minutesAgo)}
          onClick={() => select(minute.minutesAgo)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              select(minute.minutesAgo);
            }
          }}
        >
          <rect
            x={start + index * slot}
            y={30}
            width={slot}
            height={bottom - 30}
            fill="transparent"
          />
          {minute.activeUsers > 0 && (
            <>
              <rect
                x={x(index) - slot * 0.28}
                y={y(minute.activeUsers)}
                width={slot * 0.56}
                height={bottom - y(minute.activeUsers)}
                rx={compact ? 2 : 4}
                fill={selected === minute.minutesAgo ? "#0d9488" : "#1677dc"}
              />
              {(!compact || selected === minute.minutesAgo) && (
                <text
                  x={x(index)}
                  y={y(minute.activeUsers) - 9}
                  textAnchor="middle"
                  fill="#163866"
                  fontSize={12}
                  fontWeight={600}
                >
                  {formatNumber(minute.activeUsers)}
                </text>
              )}
            </>
          )}
          {selected === minute.minutesAgo && (
            <circle cx={x(index)} cy={bottom + 5} r={2} fill="#0d9488" />
          )}
          <title>{`${minuteLabel(minute.minutesAgo)}: ${formatNumber(minute.activeUsers)} کاربر فعال`}</title>
        </g>
      ))}
      {(compact ? [0, 14, 29] : [0, 9, 19, 29]).map((index) => (
        <text
          key={index}
          x={x(index)}
          y={232}
          textAnchor={index === 0 ? "start" : index === 29 ? "end" : "middle"}
          fill="#7c8da8"
          fontSize={11}
        >
          {index === 29 ? "اکنون" : `${formatNumber(29 - index)} دقیقه قبل`}
        </text>
      ))}
    </svg>
  );
}

export function RealtimeChart({ minutes }: { minutes: Minutes }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const peak = minutes.reduce<Minutes[number] | undefined>(
    (best, item) =>
      !best || item.activeUsers >= best.activeUsers ? item : best,
    undefined,
  );
  const selected = minutes.find(
    (item) => item.minutesAgo === (chosen ?? peak?.minutesAgo),
  );
  return (
    <div className={styles.realtimeChart}>
      <div className={styles.minuteChartHeader}>
        <p className={styles.meta}>
          <span className={styles.minuteLegendDot} /> هر ستون، کاربران فعال یک
          دقیقه
        </p>
        <p
          className={styles.minuteReadout}
          aria-live="polite"
          aria-atomic="true"
        >
          {selected && (
            <>
              {minuteLabel(selected.minutesAgo)} <span>·</span>{" "}
              <strong>{formatNumber(selected.activeUsers)} کاربر فعال</strong>
            </>
          )}
        </p>
      </div>
      <p className={styles.minuteAxisTitle}>تعداد کاربران</p>
      <div className={`${styles.chart} ${styles.desktopChart}`}>
        <MinutePlot
          minutes={minutes}
          selected={selected?.minutesAgo}
          select={setChosen}
        />
      </div>
      <div className={`${styles.chart} ${styles.mobileChart}`}>
        <MinutePlot
          minutes={minutes}
          selected={selected?.minutesAgo}
          select={setChosen}
          compact
        />
      </div>
      {(!peak || peak.activeUsers === 0) && (
        <p className={styles.meta}>
          در این ۳۰ دقیقه کاربر فعالی گزارش نشده است.
        </p>
      )}
      <p className={styles.meta}>
        برای دیدن مقدار هر دقیقه، ستون را لمس کنید یا نشانگر را روی آن ببرید.
        زمان‌ها نسبت به آخرین دریافت گزارش‌اند.
      </p>
    </div>
  );
}
