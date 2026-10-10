import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import { requireAdmin } from "@/actions/auth.actions";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatPrice, toPersianDigits } from "@/lib/format";
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
      label: "سفارش‌های امروز",
      value: toPersianDigits(data.todayOrders),
      detail: "از ابتدای روز به وقت تهران",
    },
    {
      label: "درآمد این ماه",
      value: formatPrice(data.monthlyRevenue),
      detail: "پرداخت‌های موفق ماه شمسی جاری",
    },
    {
      label: "سفارش‌های در انتظار",
      value: toPersianDigits(data.pendingOrders),
      detail: "سفارش‌های با وضعیت در انتظار",
    },
    {
      label: "محصولات با موجودی کم",
      value: toPersianDigits(data.lowStockCount),
      detail: "موجودی کمتر از پنج واحد",
    },
  ];
  return (
    <div className="space-y-8">
      <header className="admin-panel">
        <p className="mb-3 text-sm text-primary">پنل مدیریت / نمای کلی</p>
        <h1 className="text-2xl font-black sm:text-3xl">داشبورد فروشگاه</h1>
        <p className="mt-3 text-sm text-muted">
          نبض فروش، سفارش‌ها و موجودی؛ در یک نگاه.
        </p>
      </header>
      <section
        aria-label="آمار فروشگاه"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((stat) => (
          <article key={stat.label} className="admin-panel">
            <h2 className="text-sm text-muted">{stat.label}</h2>
            <p className="my-4 text-2xl font-black break-words text-primary">
              {stat.value}
            </p>
            <p className="text-xs text-muted">{stat.detail}</p>
          </article>
        ))}
      </section>
      <section className="admin-panel" aria-labelledby="latest-orders">
        <h2 id="latest-orders" className="text-lg font-bold">
          {toPersianDigits(10)} سفارش آخر
        </h2>
        <p className="mt-2 text-sm text-muted">
          جدیدترین سفارش‌های ثبت‌شده، از همه وضعیت‌ها
        </p>
        {data.latestOrders.length === 0 ? (
          <p className="mt-6 text-muted">هنوز سفارشی ثبت نشده است.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {data.latestOrders.map((order) => (
              <article key={order.id} className="admin-order">
                <div className="min-w-0">
                  <h3 className="font-bold">
                    <bdi>{toPersianDigits(order.orderNumber)}</bdi>
                  </h3>
                  <p className="mt-2 text-sm break-words">
                    {order.customerName}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <p className="font-bold">{formatPrice(order.total)}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    tone={order.status === "cancelled" ? "danger" : "primary"}
                  >
                    {orderLabels[order.status]}
                  </Badge>
                  <Badge
                    tone={
                      order.paymentStatus === "paid"
                        ? "success"
                        : order.paymentStatus === "failed"
                          ? "danger"
                          : "primary"
                    }
                  >
                    {paymentLabels[order.paymentStatus]}
                  </Badge>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="admin-panel" aria-labelledby="low-stock">
        <h2 id="low-stock" className="text-lg font-bold">
          محصولات با موجودی کم
        </h2>
        <p className="mt-2 text-sm text-muted">
          شامل محصولات فعال، غیرفعال و ناموجود
        </p>
        {data.lowStockProducts.length === 0 ? (
          <p className="mt-6 text-muted">
            هیچ محصولی با موجودی کمتر از پنج واحد وجود ندارد.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {data.lowStockProducts.map((product) => (
              <li key={product.id} className="admin-order">
                <span className="min-w-0 font-medium break-words">
                  {product.title}
                </span>
                <Badge tone={product.stock === 0 ? "danger" : "primary"}>
                  {product.stock === 0
                    ? "ناموجود"
                    : `${toPersianDigits(product.stock)} واحد باقی‌مانده`}
                </Badge>
                <span className="text-sm text-muted">
                  {product.isActive ? "فعال" : "غیرفعال"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
