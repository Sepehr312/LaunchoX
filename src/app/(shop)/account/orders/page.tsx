import { CustomerEmpty } from "@/components/customer/CustomerEmpty";
import { OrderBadge } from "@/components/customer/OrderBadge";
import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/actions/auth.actions";
import { listOrdersForUser } from "@/services/order.service";
import { orderQuerySchema } from "@/validations/order";
import { formatDate, formatPrice, toPersianDigits } from "@/lib/format";
export const metadata: Metadata = {
  title: `سفارش‌های من | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const parsed = orderQuerySchema.safeParse(await searchParams);
  if (!parsed.success)
    return <p className="checkout-panel">پارامترهای فهرست سفارش معتبر نیست.</p>;
  const result = await listOrdersForUser(user.id, parsed.data);
  return (
    <section>
      <h2 className="mb-6 text-2xl font-bold">سفارش‌های من</h2>
      {!result.items.length && (
        <CustomerEmpty
          title="هنوز سفارشی ندارید"
          description="پس از اولین خرید، وضعیت و جزئیات سفارش‌هایتان را اینجا خواهید دید."
          href="/products"
          label="مشاهدهٔ محصولات"
        />
      )}
      <div className="grid gap-4">
        {result.items.map((order) => (
          <Link
            key={order.id}
            href={`/account/orders/${order.id}`}
            className="checkout-panel grid items-center gap-4 sm:grid-cols-2"
          >
            <span className="font-bold">
              {toPersianDigits(order.orderNumber)}
            </span>
            <span className="text-sm text-muted">
              ثبت در {formatDate(order.createdAt)}
            </span>
            <span>{formatPrice(order.total)}</span>
            <OrderBadge status={order.status} />
            <span className="text-xs leading-6 text-muted">
              زمان تحویل:{" "}
              {order.status === "delivered"
                ? "تحویل داده شده"
                : order.status === "cancelled"
                  ? "سفارش لغو شده"
                  : "هنوز اعلام نشده"}
            </span>
            <span className="text-sm font-semibold text-primary">
              مشاهدهٔ جزئیات سفارش ←
            </span>
          </Link>
        ))}
      </div>
      <nav
        aria-label="صفحه‌بندی سفارش‌ها"
        className="mt-6 flex flex-wrap gap-6"
      >
        {result.page > 1 && (
          <Link href={`?page=${result.page - 1}`}>صفحهٔ قبل</Link>
        )}
        {result.page < result.totalPages && (
          <Link href={`?page=${result.page + 1}`}>صفحهٔ بعد</Link>
        )}
      </nav>
    </section>
  );
}
