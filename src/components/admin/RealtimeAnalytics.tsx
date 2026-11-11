import { AnalyticsCities } from "@/components/admin/AnalyticsCities";
import { AnalyticsDevices } from "@/components/admin/AnalyticsDevices";
import { RealtimeChart } from "@/components/admin/RealtimeChart";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { RealtimeAnalyticsReport } from "@/types/analytics";
import styles from "@/components/admin/AnalyticsDashboard.module.css";

export function RealtimeAnalytics({
  report,
}: {
  report: RealtimeAnalyticsReport;
}) {
  return (
    <>
      <p className={styles.meta}>
        گزارش بلادرنگ · کش و تازه‌سازی خودکار: هر {formatNumber(60)} ثانیه هنگام
        باز بودن صفحه · آخرین دریافت: {formatDateTime(report.fetchedAt)} به وقت
        تهران
      </p>
      {report.totals.activeUsers === 0 &&
        report.totals.screenPageViews === 0 && (
          <section className="admin-panel">
            <h2>فعالیتی در ۳۰ دقیقهٔ گذشته گزارش نشده است</h2>
            <p className={styles.meta}>
              اتصال برقرار است؛ گوگل در این دریافت فعالیتی برای این بازه
              برنگرداند.
            </p>
          </section>
        )}
      <section className={styles.stats} aria-label="شاخص‌های بلادرنگ">
        {(
          [
            ["کاربران فعال در ۳۰ دقیقهٔ گذشته", report.totals.activeUsers],
            ["بازدید صفحات در ۳۰ دقیقهٔ گذشته", report.totals.screenPageViews],
          ] as const
        ).map(([label, value]) => (
          <article key={label} className={`admin-panel ${styles.stat}`}>
            <h2>{label}</h2>
            <p className={styles.statValue}>{formatNumber(value)}</p>
          </article>
        ))}
      </section>
      <section className="admin-panel">
        <h2>کاربران فعال در هر دقیقه</h2>
        <RealtimeChart minutes={report.minutes} />
        <details className={styles.dailyDetails}>
          <summary>مشاهدهٔ جدول دقیقه‌ها</summary>
          <div className={styles.tableWrap}>
            <table>
              <caption className="sr-only">
                فعالیت در هر دقیقه از سی دقیقهٔ گذشته
              </caption>
              <thead>
                <tr>
                  <th scope="col">زمان</th>
                  <th scope="col">کاربران فعال</th>
                  <th scope="col">بازدید صفحات</th>
                </tr>
              </thead>
              <tbody>
                {report.minutes.map((minute) => (
                  <tr key={minute.minutesAgo}>
                    <th scope="row">
                      {minute.minutesAgo === 0
                        ? "دقیقهٔ جاری"
                        : `${formatNumber(minute.minutesAgo)} دقیقه قبل`}
                    </th>
                    <td>{formatNumber(minute.activeUsers)}</td>
                    <td>{formatNumber(minute.screenPageViews)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <p className={styles.notice}>
          معیار کاربران جدید، نشست‌ها و منابع ورود در رابط بلادرنگ گوگل ارائه
          نمی‌شوند؛ گزارش آن‌ها در بازه‌های ۷ و ۳۰ روزه موجود است.
        </p>
      </section>
      <div className={styles.columns}>
        <AnalyticsCities cities={report.cities} />
        <AnalyticsDevices devices={report.devices} />
      </div>
    </>
  );
}
