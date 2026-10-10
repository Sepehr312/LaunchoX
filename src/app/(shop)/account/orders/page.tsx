import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/actions/auth.actions";
import { listOrdersForUser } from "@/services/order.service";
import { orderQuerySchema } from "@/validations/order";
import { formatDate, formatPrice, toPersianDigits } from "@/lib/format";
import { orderLabels } from "@/types/order-labels";
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
        <p className="checkout-panel">سفارشی برای نمایش وجود ندارد.</p>
      )}
      <div className="grid gap-4">
        {result.items.map((order) => (
          <Link
            key={order.id}
            href={`/account/orders/${order.id}`}
            className="checkout-panel grid gap-3 sm:grid-cols-4"
          >
            <span className="font-bold">
              {toPersianDigits(order.orderNumber)}
            </span>
            <span>{formatDate(order.createdAt)}</span>
            <span>{formatPrice(order.total)}</span>
            <span className="text-primary">{orderLabels[order.status]}</span>
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
