import { getEnv } from "@/lib/env";
import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireUser } from "@/actions/auth.actions";
import { getOrderForUser } from "@/services/order.service";
import { objectIdSchema } from "@/validations/common";
import { AppError } from "@/lib/errors";
import { formatDate, formatPrice, toPersianDigits } from "@/lib/format";
import { orderLabels, paymentLabels } from "@/types/order-labels";
import { AccountForm } from "@/components/account/AccountForm";
const loadOrder = cache(async (id: string) => {
  const user = await requireUser();
  const parsed = objectIdSchema.safeParse(id);
  if (!parsed.success) notFound();
  const order = await getOrderForUser(user.id, parsed.data).catch(
    (error: unknown) => {
      if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
      throw error;
    },
  );
  return order;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const order = await loadOrder((await params).id);
  return {
    title: `سفارش ${toPersianDigits(order.orderNumber)} | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
  };
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const order = await loadOrder((await params).id);
  const address = order.shippingAddress;
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">
          سفارش {toPersianDigits(order.orderNumber)}
        </h2>
        <span className="text-primary">{orderLabels[order.status]}</span>
      </div>
      <p className="text-sm text-muted">ثبت در {formatDate(order.createdAt)}</p>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="checkout-panel">
          <h3 className="mb-6 text-xl font-bold">اقلام سفارش</h3>
          <div className="grid gap-5">
            {order.items.map((item) => (
              <article
                key={item.product}
                className="flex min-w-0 gap-4 border-b border-border pb-5"
              >
                <Image
                  src={item.image}
                  alt={item.title}
                  width={64}
                  height={80}
                  className="h-20 w-16 shrink-0 object-contain"
                />
                <div className="min-w-0">
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm text-muted">
                    {toPersianDigits(item.quantity)} عدد ·{" "}
                    {formatPrice(item.price)}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <dl className="mt-6 grid gap-4">
            {[
              ["جمع اقلام", order.subtotal],
              ["هزینهٔ ارسال", order.shippingFee],
              ["مبلغ کل", order.total],
            ].map(([label, amount]) => (
              <div key={label} className="flex flex-wrap justify-between gap-2">
                <dt>{label}</dt>
                <dd>{formatPrice(Number(amount))}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5">
            وضعیت پرداخت: {paymentLabels[order.payment.status]}
          </p>
          {order.payment.refId && (
            <p className="mt-3 break-all">
              شناسهٔ پرداخت: {toPersianDigits(order.payment.refId)}
            </p>
          )}
          {order.payment.paidAt && (
            <p className="mt-3">
              تاریخ پرداخت: {formatDate(order.payment.paidAt)}
            </p>
          )}
        </section>
        <div className="grid gap-6">
          <section className="checkout-panel">
            <h3 className="mb-5 text-xl font-bold">نشانی ارسال</h3>
            <p>{address.recipientName}</p>
            <p className="mt-3 leading-8 break-words">
              {address.province}، {address.city}،{" "}
              {toPersianDigits(address.addressLine)}
            </p>
            <p className="mt-3">
              کد پستی: {toPersianDigits(address.postalCode)}
            </p>
            <p className="mt-3">موبایل: {toPersianDigits(address.mobile)}</p>
            {order.note && (
              <p className="mt-5 break-words">یادداشت: {order.note}</p>
            )}
          </section>
          <section className="checkout-panel">
            <h3 className="mb-5 text-xl font-bold">تاریخچهٔ سفارش</h3>
            <ol className="grid gap-4">
              {order.statusHistory.map((entry, index) => (
                <li
                  key={index}
                  className="flex flex-wrap justify-between gap-2 border-b border-border pb-3"
                >
                  <span>{orderLabels[entry.status]}</span>
                  <time
                    dateTime={entry.changedAt}
                    className="text-sm text-muted"
                  >
                    {formatDate(entry.changedAt)}
                  </time>
                </li>
              ))}
            </ol>
          </section>
          {order.status === "pending" && (
            <AccountForm
              operation="cancel"
              id={order.id}
              label="لغو سفارش"
              confirm
            />
          )}
        </div>
      </div>
    </div>
  );
}
