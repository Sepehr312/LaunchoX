import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  Wallet,
  Clock3,
  PackageSearch,
  Plus,
  ArrowUpLeft,
  ArrowLeft,
  ListOrdered,
} from "lucide-react";
import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import { requireAdmin } from "@/actions/auth.actions";
import { AdminTableScroll } from "@/components/admin/AdminTableScroll";
import { formatDate, formatPrice, toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getDashboardStats } from "@/services/dashboard.service";
import { orderLabels, paymentLabels } from "@/types/order-labels";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `پنل مدیریت | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};

export default async function AdminPage() {
  await requireAdmin();
  const data = await getDashboardStats();
  const stats = [
    {
      icon: ShoppingBag,
      label: "سفارش‌های امروز",
      value: toPersianDigits(data.todayOrders),
      detail: "از ابتدای روز به وقت تهران",
    },
    {
      icon: Wallet,
      label: "درآمد این ماه",
      value: formatPrice(data.monthlyRevenue),
      detail: "پرداخت‌های موفق ماه شمسی جاری",
    },
    {
      icon: Clock3,
      label: "سفارش‌های در انتظار",
      value: toPersianDigits(data.pendingOrders),
      detail: "سفارش‌های با وضعیت در انتظار",
    },
    {
      icon: PackageSearch,
      label: "محصولات با موجودی کم",
      value: toPersianDigits(data.lowStockCount),
      detail: "موجودی کمتر از پنج واحد",
    },
  ];
  return (
    <div className="admin-overview">
      <header className="admin-panel admin-page-header admin-approved-header">
        <div>
          <p className="admin-eyebrow">پنل مدیریت / نمای کلی</p>
          <h1>داشبورد فروشگاه</h1>
          <p className="admin-hint mt-2">
            نبض فروش، سفارش‌ها و موجودی؛ در یک نگاه.
          </p>
        </div>
        <Link
          className="admin-primary admin-create-button"
          href="/admin/products/new"
          aria-label="محصول جدید"
          title="محصول جدید"
        >
          <Plus size={20} aria-hidden="true" />
          <span className="admin-create-label">محصول جدید</span>
        </Link>
      </header>
      <section aria-label="آمار فروشگاه" className="admin-stats-grid">
        {stats.map((stat) => (
          <article key={stat.label} className="admin-panel admin-stat-card">
            <span className="admin-stat-icon">
              <stat.icon size={22} aria-hidden="true" />
            </span>
            <h2>{stat.label}</h2>
            <p className="admin-stat-value">{stat.value}</p>
            <p className="admin-stat-detail">{stat.detail}</p>
          </article>
        ))}
      </section>
      <div className="admin-dashboard-columns">
        <section
          className="admin-panel admin-recent-orders"
          aria-labelledby="latest-orders"
        >
          <div className="admin-section-heading">
            <div>
              <h2 id="latest-orders">
                <ListOrdered size={20} aria-hidden="true" />
                {toPersianDigits(3)} سفارش آخر
              </h2>
              <p className="admin-hint">
                جدیدترین سفارش‌های ثبت‌شده، از همه وضعیت‌ها
              </p>
            </div>
            <Link className="admin-view-all" href="/admin/orders">
              مشاهده همه
              <ArrowLeft size={16} aria-hidden="true" />
            </Link>
          </div>
          {data.latestOrders.length === 0 ? (
            <p className="admin-empty">هنوز سفارشی ثبت نشده است.</p>
          ) : (
            <AdminTableScroll label="جدول آخرین سفارش‌ها">
              <table className="admin-orders-table">
                <thead>
                  <tr>
                    {[
                      "شماره سفارش",
                      "مشتری",
                      "مبلغ",
                      "وضعیت سفارش",
                      "وضعیت پرداخت",
                    ].map((label) => (
                      <th scope="col" key={label}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.latestOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="admin-order-link"
                        >
                          <bdi>{toPersianDigits(order.orderNumber)}</bdi>
                          <ArrowUpLeft size={14} aria-hidden="true" />
                        </Link>
                        <span className="admin-order-date">
                          {formatDate(order.createdAt)}
                        </span>
                      </td>
                      <td>{order.customerName}</td>
                      <td className="admin-price-cell">
                        {formatPrice(order.total)}
                      </td>
                      <td>
                        <span
                          className={cn(
                            "admin-badge",
                            order.status === "cancelled" &&
                              "admin-badge-danger",
                          )}
                        >
                          {orderLabels[order.status]}
                        </span>
                      </td>
                      <td>
                        <span
                          className={cn(
                            "admin-badge",
                            order.paymentStatus === "paid"
                              ? "admin-badge-success"
                              : order.paymentStatus === "failed"
                                ? "admin-badge-danger"
                                : undefined,
                          )}
                        >
                          {paymentLabels[order.paymentStatus]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableScroll>
          )}
        </section>
        <section
          className="admin-panel admin-low-stock"
          aria-labelledby="low-stock"
        >
          <div className="admin-section-heading">
            <div>
              <h2 id="low-stock">
                <PackageSearch size={20} aria-hidden="true" />
                موجودی کم
              </h2>
              <p className="admin-hint">
                موجودی کمتر از پنج واحد؛ فعال و غیرفعال
              </p>
            </div>
          </div>
          {data.lowStockProducts.length === 0 ? (
            <p className="admin-empty">
              هیچ محصولی با موجودی کمتر از پنج واحد وجود ندارد.
            </p>
          ) : (
            <ul className="admin-stock-list">
              {data.lowStockProducts.map((product) => (
                <li key={product.id}>
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="admin-stock-item"
                  >
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt=""
                        width={48}
                        height={60}
                        unoptimized
                        className="admin-stock-image"
                      />
                    ) : (
                      <PackageSearch size={32} aria-hidden="true" />
                    )}
                    <span className="admin-stock-copy">
                      <strong>{product.title}</strong>
                      <span
                        className={cn(
                          "admin-badge",
                          product.stock === 0 && "admin-badge-danger",
                        )}
                      >
                        {product.stock === 0
                          ? "ناموجود"
                          : `${toPersianDigits(product.stock)} واحد باقی‌مانده`}
                      </span>
                      {!product.isActive && <small>غیرفعال</small>}
                    </span>
                    <ArrowUpLeft size={16} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
