import { getEnv } from "@/lib/env";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import {
  listOrdersAdmin,
  getOrderCustomersAdmin,
} from "@/services/order.service";
import { orderQuerySchema } from "@/validations/order";
import { orderStatuses } from "@/types/domain";
import { orderLabels, paymentLabels } from "@/types/order-labels";
import { formatDate, formatPrice, toPersianDigits } from "@/lib/format";
import { Pagination } from "@/components/store/Pagination";
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
  const parsed = orderQuerySchema.safeParse({
    status: params.status === "" ? undefined : params.status,
    page: params.page,
  });
  if (!parsed.success)
    return (
      <section className="admin-panel">
        <h1>مدیریت سفارش‌ها</h1>
        <p role="alert">وضعیت یا شمارهٔ صفحه معتبر نیست.</p>
        <Link href="/admin/orders">بازگشت به سفارش‌ها</Link>
      </section>
    );
  const result = await listOrdersAdmin(parsed.data);
  const customers = new Map(
    (await getOrderCustomersAdmin(result.items.map((order) => order.user))).map(
      (customer) => [customer.id, customer],
    ),
  );
  return (
    <section className="admin-panel grid min-w-0 gap-5">
      <h1>مدیریت سفارش‌ها</h1>
      <form className="flex flex-wrap items-end gap-3">
        <label className="min-w-0">
          وضعیت سفارش
          <select
            name="status"
            className="field-input"
            defaultValue={parsed.data.status ?? ""}
          >
            <option value="">همهٔ وضعیت‌ها</option>
            {orderStatuses.map((status) => (
              <option value={status} key={status}>
                {orderLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <button>اعمال فیلتر</button>
      </form>
      <p>{toPersianDigits(result.total)} سفارش</p>
      {result.items.length ? (
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr>
                {[
                  "شماره سفارش",
                  "مشتری",
                  "تاریخ",
                  "مبلغ",
                  "پرداخت",
                  "وضعیت",
                ].map((label) => (
                  <th key={label} className="p-3 text-start">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.items.map((order) => (
                <tr key={order.id}>
                  <td className="p-3">
                    <Link href={`/admin/orders/${order.id}`}>
                      {toPersianDigits(order.orderNumber)}
                    </Link>
                  </td>
                  <td className="p-3">
                    {customers.get(order.user)?.name ?? "مشتری حذف‌شده"}
                  </td>
                  <td className="p-3">{formatDate(order.createdAt)}</td>
                  <td className="p-3">{formatPrice(order.total)}</td>
                  <td className="p-3">{paymentLabels[order.payment.status]}</td>
                  <td className="p-3">{orderLabels[order.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-6 text-sm text-muted">
          {parsed.data.status
            ? "سفارشی با وضعیت انتخاب‌شده پیدا نشد؛ وضعیت دیگری را انتخاب کنید."
            : "سفارشی در این صفحه برای نمایش وجود ندارد."}
        </p>
      )}
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/admin/orders"
        searchParams={params}
      />
    </section>
  );
}
