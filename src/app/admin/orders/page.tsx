import { getEnv } from "@/lib/env";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpLeft,
  Clock3,
  PackageCheck,
  PackageSearch,
  Truck,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { requireAdmin } from "@/actions/auth.actions";
import {
  listOrdersAdmin,
  getOrderCustomersAdmin,
  getOrderStatusCountsAdmin,
} from "@/services/order.service";
import { adminOrderQuerySchema } from "@/validations/order";
import { orderLabels, paymentLabels } from "@/types/order-labels";
import { formatDate, formatPrice, toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdminListHeader } from "@/components/admin/AdminListHeader";
import { AdminTableScroll } from "@/components/admin/AdminTableScroll";
import { OrderFilters } from "@/components/admin/OrderFilters";
import styles from "@/components/admin/Orders.module.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `مدیریت سفارش‌ها | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};

export default async function OrdersAdmin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const parsed = adminOrderQuerySchema.safeParse(params);
  if (!parsed.success)
    return (
      <section className="admin-panel">
        <h1>مدیریت سفارش‌ها</h1>
        <p role="alert">وضعیت، جستجو یا شمارهٔ صفحه معتبر نیست.</p>
        <Link href="/admin/orders">بازگشت به سفارش‌ها</Link>
      </section>
    );
  const result = await listOrdersAdmin(parsed.data);
  const [counts, customerList] = await Promise.all([
    getOrderStatusCountsAdmin(),
    getOrderCustomersAdmin(result.items.map((order) => order.user)),
  ]);
  const customers = new Map(
    customerList.map((customer) => [customer.id, customer]),
  );
  const stats = [
    {
      icon: Clock3,
      label: "منتظر پرداخت",
      value: counts.pending,
      detail: "سفارش‌های در انتظار پرداخت مشتری",
    },
    {
      icon: PackageSearch,
      label: "در حال آماده‌سازی",
      value: counts.processing,
      detail: "سفارش‌های در حال آماده‌سازی",
    },
    {
      icon: Truck,
      label: "ارسال‌شده",
      value: counts.shipped,
      detail: "سفارش‌های ارسال‌شده به مشتریان",
    },
    {
      icon: PackageCheck,
      label: "تحویل‌شده",
      value: counts.delivered,
      detail: "سفارش‌های تحویل‌داده‌شده به مشتریان",
    },
  ];
  function pageHref(page: number) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string" && key !== "page") next.set(key, value);
    }
    if (page > 1) next.set("page", String(page));
    return `/admin/orders${next.size ? `?${next}` : ""}`;
  }
  const pages = Array.from(
    { length: Math.min(5, result.totalPages) },
    (_, index) =>
      Math.max(1, Math.min(result.page - 2, result.totalPages - 4)) + index,
  );
  const filtered = Boolean(
    parsed.data.q ||
    parsed.data.status ||
    parsed.data.payment ||
    parsed.data.period,
  );
  return (
    <div className={cn("admin-list-page", styles.page)}>
      <AdminListHeader
        title="مدیریت سفارش‌ها"
        section="سفارش‌ها"
        description="بررسی پرداخت‌ها و مدیریت آماده‌سازی و ارسال سفارش‌ها"
      />
      <section
        aria-label="آمار وضعیت سفارش‌ها"
        className={cn("admin-stats-grid", styles.stats)}
      >
        {stats.map((stat) => (
          <article key={stat.label} className="admin-panel admin-stat-card">
            <span className="admin-stat-icon">
              <stat.icon size={22} aria-hidden="true" />
            </span>
            <h2>{stat.label}</h2>
            <p className="admin-stat-value">{toPersianDigits(stat.value)}</p>
            <p className="admin-stat-detail">{stat.detail}</p>
          </article>
        ))}
      </section>
      <section
        className={cn("admin-panel admin-list-panel", styles.panel)}
        aria-label="فهرست سفارش‌ها"
      >
        <OrderFilters query={parsed.data} counts={counts} />
        <p className={styles.count}>{toPersianDigits(result.total)} سفارش</p>
        {result.items.length ? (
          <AdminTableScroll label="جدول سفارش‌ها">
            <table className={cn("admin-orders-table", styles.table)}>
              <thead>
                <tr>
                  {[
                    "شماره سفارش",
                    "مشتری",
                    "مبلغ کل",
                    "وضعیت سفارش",
                    "وضعیت پرداخت",
                    "عملیات",
                  ].map((label) => (
                    <th scope="col" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.items.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        className="admin-order-link"
                        href={`/admin/orders/${order.id}`}
                      >
                        <bdi>{toPersianDigits(order.orderNumber)}</bdi>
                        <ArrowUpLeft size={14} aria-hidden="true" />
                      </Link>
                      <span className="admin-order-date">
                        {formatDate(order.createdAt)}
                      </span>
                    </td>
                    <td>
                      {customers.get(order.user)?.name ?? "مشتری حذف‌شده"}
                    </td>
                    <td className={styles.amount}>
                      {formatPrice(order.total)}
                    </td>
                    <td>
                      <span
                        className={cn(
                          "admin-badge",
                          order.status === "cancelled" && "admin-badge-danger",
                          order.status === "delivered" && "admin-badge-success",
                        )}
                      >
                        {orderLabels[order.status]}
                      </span>
                    </td>
                    <td>
                      <span
                        className={cn(
                          "admin-badge",
                          order.payment.status === "paid"
                            ? "admin-badge-success"
                            : order.payment.status === "failed"
                              ? "admin-badge-danger"
                              : order.payment.status === "unpaid"
                                ? "admin-badge-warning"
                                : undefined,
                        )}
                      >
                        {paymentLabels[order.payment.status]}
                      </span>
                    </td>
                    <td>
                      <Link
                        className={styles.review}
                        href={`/admin/orders/${order.id}`}
                        aria-label={`بررسی سفارش ${toPersianDigits(order.orderNumber)}`}
                      >
                        بررسی
                        <ArrowLeft size={16} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableScroll>
        ) : (
          <p className="admin-empty">
            {filtered
              ? "سفارشی با فیلترهای انتخاب‌شده پیدا نشد؛ جستجو یا فیلترها را تغییر دهید."
              : "سفارشی برای نمایش وجود ندارد."}
          </p>
        )}
        <footer className={styles.footer}>
          <p>
            {result.items.length
              ? `نمایش ${toPersianDigits((result.page - 1) * result.limit + 1)} تا ${toPersianDigits((result.page - 1) * result.limit + result.items.length)} از ${toPersianDigits(result.total)} سفارش`
              : `${toPersianDigits(result.total)} سفارش`}
          </p>
          {result.totalPages > 1 && (
            <nav className={styles.pages} aria-label="صفحه‌بندی سفارش‌ها">
              {result.page > 1 && (
                <Link
                  href={pageHref(result.page - 1)}
                  scroll={false}
                  aria-label="صفحه قبلی"
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
              )}
              {pages.map((page) => (
                <Link
                  key={page}
                  href={pageHref(page)}
                  scroll={false}
                  aria-label={`صفحه ${toPersianDigits(page)}`}
                  aria-current={page === result.page ? "page" : undefined}
                >
                  {toPersianDigits(page)}
                </Link>
              ))}
              {result.page < result.totalPages && (
                <Link
                  href={pageHref(result.page + 1)}
                  scroll={false}
                  aria-label="صفحه بعدی"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </Link>
              )}
            </nav>
          )}
        </footer>
      </section>
    </div>
  );
}
