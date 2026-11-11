"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Activity,
  ChartNoAxesCombined,
  Eye,
  Info,
  Link2,
  RefreshCw,
  Users,
  UserPlus,
  TriangleAlert,
} from "lucide-react";
import { refreshAnalyticsAction } from "@/actions/admin/analytics.actions";
import { AnalyticsChart } from "@/components/admin/AnalyticsChart";
import { RealtimeAnalytics } from "@/components/admin/RealtimeAnalytics";
import { AnalyticsCities } from "@/components/admin/AnalyticsCities";
import { AnalyticsDevices } from "@/components/admin/AnalyticsDevices";
import {
  formatDateTime,
  formatNumber,
  formatReportDate,
  percentageChange,
} from "@/lib/format";
import type {
  AnalyticsFailureCode,
  AnalyticsDiagnostic,
  AnalyticsMetric,
  AnalyticsResult,
} from "@/types/analytics";
import styles from "@/components/admin/AnalyticsDashboard.module.css";

const metrics: { key: AnalyticsMetric; label: string; icon: typeof Users }[] = [
  { key: "activeUsers", label: "کاربران فعال", icon: Users },
  { key: "newUsers", label: "کاربران جدید", icon: UserPlus },
  { key: "screenPageViews", label: "بازدید صفحات", icon: Eye },
  { key: "sessions", label: "نشست‌ها", icon: Activity },
];
const failures: Record<
  AnalyticsFailureCode,
  { title: string; detail: string }
> = {
  configuration: {
    title: "تنظیمات گزارش کامل نیست",
    detail:
      "شناسهٔ پراپرتی و اطلاعات حساب سرویس باید در تنظیمات محرمانهٔ سرور ثبت و معتبر باشند. مدیر سرور تنظیمات اتصال را بررسی کند.",
  },
  forbidden: {
    title: "دسترسی گوگل تأیید نشد",
    detail:
      "دسترسی حساب سرویس به پراپرتی، اعتبار کلید و فعال بودن رابط گزارش‌گیری گوگل را بررسی کنید.",
  },
  connection: {
    title: "دریافت گزارش از گوگل انجام نشد",
    detail:
      "ارتباط یا پاسخ سرویس گزارش‌گیری معتبر نبود. کمی بعد دوباره تلاش کنید؛ این خطا به معنی صفر بودن آمار نیست.",
  },
  quota: {
    title: "سهمیهٔ گزارش‌گیری گوگل محدود شده است",
    detail: "گوگل فعلاً درخواست بیشتری نمی‌پذیرد. کمی بعد دوباره تلاش کنید.",
  },
  busy: {
    title: "کمی تا درخواست بعدی صبر کنید",
    detail:
      "گزارش در حال دریافت است یا محدودیت تازه‌سازی فعال است. دریافت مجدد برای همهٔ مدیران و همهٔ بازه‌ها محدود می‌شود.",
  },
  storage: {
    title: "ذخیره‌سازی گزارش در دسترس نیست",
    detail:
      "اتصال به حافظهٔ مشترک گزارش‌ها برقرار نشد. مدیر سرور اتصال پایگاه داده را بررسی کند.",
  },
  invalid: {
    title: "بازهٔ گزارش معتبر نیست",
    detail: "یکی از بازه‌های سی دقیقهٔ گذشته، هفت یا سی روزه را انتخاب کنید.",
  },
};
const diagnostics: Record<AnalyticsDiagnostic, string> = {
  "key-invalid":
    "کلید خصوصی در سرور قابل پردازش نیست. قالب و کامل بودن مقدار کلید را در تنظیمات محرمانهٔ سرور بررسی کنید؛ وجود مقدار به‌تنهایی کافی نیست.",
  "token-rejected":
    "گوگل احراز هویت حساب سرویس را رد کرده است. مطابقت کلید و حساب سرویس، معتبر بودن کلید و ساعت سرور را بررسی کنید.",
  dns: "سرور نتوانست نشانی سرویس گوگل را پیدا کند. تنظیمات نام دامنه و دسترسی خروجی شبکهٔ میزبان بررسی شود.",
  timeout:
    "مهلت اتصال یا دریافت پاسخ از گوگل تمام شد. دسترسی خروجی سرور به سرویس گزارش‌گیری و احراز هویت گوگل بررسی شود.",
  transport:
    "ارتباط شبکه یا اتصال امن سرور به گوگل برقرار نشد. مسیر خروجی شبکه، پراکسی و گواهی‌های سرور بررسی شوند.",
  "google-unavailable":
    "سرویس گوگل یا مسیر ارتباطی آن موقتاً در دسترس نیست. کمی بعد تلاش کنید و در صورت تکرار، شبکهٔ میزبان بررسی شود.",
  "api-disabled":
    "گوگل اعلام کرده رابط موردنیاز برای پروژهٔ حساب سرویس فعال نیست. فعال بودن رابط گزارش‌گیری در همان پروژه بررسی شود.",
  "request-rejected":
    "گوگل درخواست گزارش را نامعتبر تشخیص داده است. مدیر فنی باید سازگاری درخواست با رابط گزارش‌گیری را بررسی کند.",
  "response-invalid":
    "پاسخ دریافت‌شده از گوگل با قالب مورد انتظار گزارش سازگار نیست. این وضعیت خطای پردازش گزارش است و آمار صفر محسوب نمی‌شود.",
  "time-zone-missing":
    "پاسخ گوگل منطقهٔ زمانی پراپرتی را مشخص نکرده است. برای جلوگیری از گزارش با تاریخ اشتباه، نمایش آمار متوقف شد.",
  unknown:
    "علت خطا از کدهای شناخته‌شده مشخص نشد. مدیر فنی باید اتصال را در محیط سرور بررسی کند؛ متن خام خطا برای حفظ اطلاعات محرمانه نمایش داده نمی‌شود.",
};
const pageLabels: Record<string, string> = {
  "/": "صفحه اصلی",
  "/products": "فهرست محصولات",
  "/products/[slug]": "صفحات محصول (تجمیعی)",
  "/categories": "فهرست دسته‌بندی‌ها",
  "/categories/[slug]": "صفحات دسته‌بندی (تجمیعی)",
  "/brands": "فهرست برندها",
  "/brands/[slug]": "صفحات برند (تجمیعی)",
  "/search": "جستجو",
  "/cart": "سبد خرید",
  "/compare": "مقایسه",
  "/about": "درباره ما",
  "/services": "خدمات",
};

export function AnalyticsDashboard({
  days,
  initialResult,
}: {
  days: "realtime" | "7" | "30";
  initialResult: AnalyticsResult;
}) {
  const [result, setResult] = useState(initialResult);
  const [pending, startTransition] = useTransition();
  const [cooldown, setCooldown] = useState(
    !initialResult.ok ? (initialResult.retryAfterSeconds ?? 0) : 0,
  );
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  const refresh = useCallback(
    () =>
      startTransition(async () => {
        try {
          const next = await refreshAnalyticsAction({ days });
          setResult(next);
          setCooldown(
            !next.ok && next.retryAfterSeconds ? next.retryAfterSeconds : 60,
          );
        } catch {
          setResult({ ok: false, code: "connection" });
          setCooldown(60);
        }
      }),
    [days],
  );
  useEffect(() => {
    if (days !== "realtime" || pending) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60000);
    return () => clearInterval(timer);
  }, [days, pending, refresh]);
  const received = result.ok ? result.report : null;
  const liveReport = received?.days === "realtime" ? received : null;
  const report = received && received.days !== "realtime" ? received : null;
  const empty =
    report &&
    Object.values(report.totals).every((value) => value === 0) &&
    report.sources.length === 0 &&
    report.pages.length === 0;
  const sourceMax = Math.max(
    1,
    ...(report?.sources.map((source) => source.sessions) ?? []),
  );
  return (
    <div className={styles.dashboard} aria-busy={pending}>
      <header className="admin-panel">
        <div className={styles.heading}>
          <div>
            <p className="admin-eyebrow">پنل مدیریت / آمار و عملکرد</p>
            <h1>آمار و عملکرد</h1>
            <p className="admin-hint mt-2">
              گزارشی از بازدید و رفتار کاربران فروشگاه.
            </p>
          </div>
          <button
            type="button"
            className="admin-primary"
            disabled={pending || cooldown > 0}
            onClick={refresh}
          >
            <RefreshCw
              size={18}
              className={pending ? styles.spinning : undefined}
              aria-hidden="true"
            />
            {pending
              ? "در حال دریافت…"
              : cooldown > 0
                ? `تلاش مجدد در ${formatNumber(cooldown)} ثانیه`
                : "به‌روزرسانی"}
          </button>
        </div>
        <div className={styles.toolbar}>
          <nav className={styles.ranges} aria-label="بازهٔ گزارش">
            {(["realtime", "7", "30"] as const).map((value) => (
              <Link
                key={value}
                href={`/admin/analytics?days=${value}`}
                aria-current={days === value ? "page" : undefined}
              >
                {value === "realtime"
                  ? "۳۰ دقیقهٔ گذشته"
                  : `${formatNumber(Number(value))} روز`}
              </Link>
            ))}
          </nav>
          {report && (
            <p className={styles.rangeDate}>
              {formatReportDate(report.range.startDate)} تا{" "}
              {formatReportDate(report.range.endDate)}
            </p>
          )}
          <p className={styles.meta}>
            {received
              ? `آخرین دریافت گزارش: ${formatDateTime(received.fetchedAt)} (به وقت تهران)`
              : "هنوز گزارش معتبری دریافت نشده است."}
          </p>
        </div>
        <p className={styles.notice}>
          <Info size={16} aria-hidden="true" />
          {days === "realtime"
            ? "گزارش بلادرنگِ ۳۰ دقیقهٔ گذشته است؛ ثبت و پردازش رویدادها ممکن است کمی تأخیر داشته باشد. زمان دریافت گزارش، زمان تازگی داده‌های گوگل نیست."
            : "بازه تا پایان روز گذشته است. داده‌های گوگل ممکن است با تأخیر تکمیل شوند؛ زمان دریافت، زمان تازگی داده‌های گوگل نیست."}
        </p>
        {report && (
          <p className={styles.meta}>
            منطقه زمانی گزارش: <bdi>{report.timeZone}</bdi> · کش گزارش:{" "}
            {formatNumber(15)} دقیقه · فاصلهٔ تازه‌سازی دستی: حداقل{" "}
            {formatNumber(60)} ثانیه
          </p>
        )}
      </header>
      <div aria-live="polite" aria-atomic="true">
        {!result.ok && (
          <section className={`admin-panel ${styles.error}`} role="alert">
            <TriangleAlert aria-hidden="true" />
            <h2>{failures[result.code].title}</h2>
            <p>{failures[result.code].detail}</p>
            {result.diagnostic && (
              <p>
                <strong>جزئیات بررسی: </strong>
                {diagnostics[result.diagnostic]}
              </p>
            )}
            {result.retryAfterSeconds && (
              <p>
                تلاش مجدد پس از حدود {formatNumber(result.retryAfterSeconds)}{" "}
                ثانیه.
              </p>
            )}
          </section>
        )}
        {empty && (
          <section className={`admin-panel ${styles.empty}`}>
            <ChartNoAxesCombined aria-hidden="true" />
            <h2>داده‌ای برای این بازه ثبت نشده است</h2>
            <p>
              اتصال گزارش‌گیری برقرار شد، اما گوگل برای این بازه ردیف داده‌ای
              برنگرداند. تأخیر پردازش و محدودیت‌های احتمالی گزارش را نیز در نظر
              بگیرید.
            </p>
          </section>
        )}
      </div>
      {liveReport && <RealtimeAnalytics report={liveReport} />}
      {report && (
        <>
          {report.limitedData && (
            <p className={styles.warning}>
              گوگل برای این گزارش محدودیت، علت خالی بودن، آستانهٔ نمایش یا
              نمونه‌گیری اعلام کرده است؛ نتایج ممکن است کامل نباشند.
            </p>
          )}
          <section className={styles.stats} aria-label="شاخص‌های بازه">
            {metrics.map(({ key, label, icon: Icon }) => {
              const previous = report.previous[key];
              const change = percentageChange(report.totals[key], previous);
              return (
                <article key={key} className={`admin-panel ${styles.stat}`}>
                  <div className={styles.statHeading}>
                    <span className={styles.icon}>
                      <Icon size={23} aria-hidden="true" />
                    </span>
                    <h2>{label}</h2>
                  </div>
                  <p className={styles.statValue}>
                    {formatNumber(report.totals[key])}
                  </p>
                  {report && (
                    <p
                      className={
                        change !== null && change < 0
                          ? styles.negative
                          : styles.positive
                      }
                    >
                      {change === null ? (
                        "درصد تغییر قابل محاسبه نیست"
                      ) : (
                        <bdi
                          className={styles.changeValue}
                        >{`${change > 0 ? "+" : ""}${formatNumber(change, 1)}٪`}</bdi>
                      )}
                    </p>
                  )}
                  {report && (
                    <p className={styles.meta}>
                      نسبت به {formatNumber(Number(days))} روز قبل · مقدار قبلی:{" "}
                      {formatNumber(previous)}
                    </p>
                  )}
                </article>
              );
            })}
          </section>
          {report && (
            <p className={styles.meta}>
              بازهٔ مقایسه: {formatReportDate(report.previousRange.startDate)}{" "}
              تا {formatReportDate(report.previousRange.endDate)}. اگر مقدار
              قبلی صفر باشد، درصد تغییر نمایش داده نمی‌شود.
            </p>
          )}
          <section className="admin-panel">
            <div className={styles.sectionHeading}>
              <h2>
                <ChartNoAxesCombined size={21} aria-hidden="true" />
                روند روزانه کاربران و بازدید صفحات
              </h2>
              <div className={styles.legend}>
                <span>
                  <i className={styles.teal} />
                  کاربران فعال
                </span>
                <span>
                  <i className={styles.blue} />
                  بازدید صفحات
                </span>
              </div>
            </div>
            <p className={styles.meta}>
              محور عمودی: تعداد · کاربران کل بازه از گزارش تجمیعی دریافت
              شده‌اند.
            </p>
            <AnalyticsChart daily={report.daily} />
          </section>
          <div className={styles.columns}>
            <section className="admin-panel">
              <h2 className={styles.panelTitle}>
                <Eye size={21} aria-hidden="true" />
                صفحات پربازدید
              </h2>
              <p className={styles.meta}>
                حداکثر {formatNumber(10)} مسیر با بیشترین بازدید
              </p>
              {report.pages.length === 0 ? (
                <p className={styles.empty}>
                  در این بازه بازدید صفحه‌ای گزارش نشده است.
                </p>
              ) : (
                <div className={styles.tableWrap}>
                  <table>
                    <caption className="sr-only">
                      صفحات پربازدید بر اساس تعداد بازدید صفحات
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">صفحه</th>
                        <th scope="col">مسیر</th>
                        <th scope="col">بازدید صفحات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.pages.map((page) => (
                        <tr key={page.path}>
                          <th scope="row">
                            {pageLabels[page.path] ?? "مسیر ثبت‌شده"}
                          </th>
                          <td>
                            <bdi className={styles.path}>{page.path}</bdi>
                          </td>
                          <td>{formatNumber(page.views)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className={styles.notice}>
                بازدید صفحات محصول به‌صورت تجمیعی ثبت می‌شود؛ آمار جداگانهٔ
                محصولات موجود نیست.
              </p>
            </section>
            <section className="admin-panel">
              <h2 className={styles.panelTitle}>
                <Link2 size={21} aria-hidden="true" />
                منابع ورود
              </h2>
              <p className={styles.meta}>
                تعداد نشست‌ها به تفکیک منبع / رسانه · حداکثر {formatNumber(6)}{" "}
                منبع برتر
              </p>
              {report.sources.length === 0 ? (
                <p className={styles.empty}>
                  در این بازه منبع ورودی گزارش نشده است.
                </p>
              ) : (
                <ul className={styles.sources}>
                  {report.sources.map((source) => (
                    <li key={source.source}>
                      <div>
                        <bdi>
                          {source.source === "(not set)"
                            ? "تعیین‌نشده"
                            : source.source}
                        </bdi>
                        <span>{formatNumber(source.sessions)} نشست</span>
                      </div>
                      <div className={styles.bar} aria-hidden="true">
                        <span
                          style={{
                            width: `${(source.sessions / sourceMax) * 100}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className={styles.notice}>
                این مقادیر تعداد نشست هستند، نه تعداد کاربر. منابع برتر لزوماً
                همهٔ نشست‌ها را پوشش نمی‌دهند.
              </p>
            </section>
          </div>
          <div className={styles.columns}>
            <AnalyticsCities cities={report.cities} />
            <AnalyticsDevices devices={report.devices} />
          </div>
        </>
      )}
    </div>
  );
}
