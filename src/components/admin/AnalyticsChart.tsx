import { formatNumber, formatReportDate } from "@/lib/format";
import type { AnalyticsReport } from "@/types/analytics";
import styles from "@/components/admin/AnalyticsDashboard.module.css";

function ChartPlot({
  daily,
  compact = false,
}: {
  daily: AnalyticsReport["daily"];
  compact?: boolean;
}) {
  const maximum = Math.max(
    1,
    ...daily.flatMap((day) => [day.activeUsers, day.screenPageViews]),
  );
  const width = compact ? 340 : 1020;
  const start = compact ? 46 : 70;
  const end = compact ? 310 : 970;
  const x = (index: number) =>
    start + (index / Math.max(1, daily.length - 1)) * (end - start);
  const y = (value: number) => 230 - (value / maximum) * 200;
  const series = (metric: "activeUsers" | "screenPageViews") =>
    daily.map((day, index) => `${x(index)},${y(day[metric])}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} 290`}
      role="img"
      aria-label="نمودار روزانه کاربران فعال و بازدید صفحات؛ مقادیر دقیق در جدول زیر نمودار موجود است"
    >
      {[0, 1, 2, 3, 4].map((tick) => (
        <g key={tick}>
          <line
            x1={start}
            x2={end}
            y1={y((maximum * tick) / 4)}
            y2={y((maximum * tick) / 4)}
            stroke="#d8e8f8"
          />
          <text
            x={start - 10}
            y={y((maximum * tick) / 4) + 5}
            textAnchor="end"
            className={styles.axis}
          >
            {formatNumber((maximum * tick) / 4)}
          </text>
        </g>
      ))}
      <polyline
        points={series("screenPageViews")}
        fill="none"
        stroke="#006acb"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <polyline
        points={series("activeUsers")}
        fill="none"
        stroke="#0d9488"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {daily.map((day, index) => (
        <g key={day.date}>
          <circle
            cx={x(index)}
            cy={y(day.screenPageViews)}
            r="3.5"
            fill="white"
            stroke="#006acb"
          >
            <title>{`${formatReportDate(day.date)}: ${formatNumber(day.screenPageViews)} بازدید صفحات`}</title>
          </circle>
          <circle
            cx={x(index)}
            cy={y(day.activeUsers)}
            r="3.5"
            fill="white"
            stroke="#0d9488"
          >
            <title>{`${formatReportDate(day.date)}: ${formatNumber(day.activeUsers)} کاربر فعال`}</title>
          </circle>
          {(index === 0 ||
            index === daily.length - 1 ||
            index % Math.ceil(daily.length / (compact ? 2 : 6)) === 0) && (
            <text
              x={x(index)}
              y="265"
              textAnchor="middle"
              className={styles.axis}
            >
              {formatReportDate(day.date, true)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function AnalyticsChart({ daily }: { daily: AnalyticsReport["daily"] }) {
  return (
    <>
      <div className={`${styles.chart} ${styles.desktopChart}`}>
        <ChartPlot daily={daily} />
      </div>
      <div className={`${styles.chart} ${styles.mobileChart}`}>
        <ChartPlot daily={daily} compact />
      </div>
      <details className={styles.dailyDetails}>
        <summary>مشاهده جدول روزانه</summary>
        <div className={styles.tableWrap}>
          <table>
            <caption className="sr-only">مقادیر دقیق نمودار روزانه</caption>
            <thead>
              <tr>
                <th scope="col">روز</th>
                <th scope="col">کاربران فعال</th>
                <th scope="col">بازدید صفحات</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((day) => (
                <tr key={day.date}>
                  <th scope="row">{formatReportDate(day.date)}</th>
                  <td>{formatNumber(day.activeUsers)}</td>
                  <td>{formatNumber(day.screenPageViews)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
