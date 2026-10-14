import { CopyOrderNumber } from "@/components/customer/CopyOrderNumber";
import styles from "@/components/customer/customer.module.css";
import { OrderBadge } from "@/components/customer/OrderBadge";
import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireUser } from "@/actions/auth.actions";
import { getOrderByNumberForUser } from "@/services/order.service";
import { orderNumberInput } from "@/validations/order";
import { formatPrice, formatDate, toPersianDigits } from "@/lib/format";

export const metadata: Metadata = {
  title: `نتیجهٔ پرداخت | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default async function CheckoutResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const parsed = orderNumberInput.safeParse({
    orderNumber: (await searchParams).order,
  });
  if (!parsed.success) notFound();
  const order = await getOrderByNumberForUser(
    user.id,
    parsed.data.orderNumber,
  ).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "NOT_FOUND") return null;
    throw error;
  });
  if (!order) notFound();
  const paid = order.payment.status === "paid";
  const failed =
    order.payment.status === "failed" || order.status === "cancelled";
  return (
    <main className="store-shell py-12">
      <section className="checkout-panel mx-auto max-w-2xl">
        <p className="section-kicker">نتیجهٔ سفارش شما</p>
        <div className="mt-4">
          <OrderBadge status={order.payment.status} payment />
        </div>
        <div
          aria-hidden="true"
          className={
            paid
              ? "checkout-result-symbol text-success"
              : failed
                ? "checkout-result-symbol text-danger"
                : `checkout-result-symbol ${styles.pending}`
          }
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            className="size-8"
            aria-hidden="true"
          >
            {paid ? (
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="m7 12 3 3 7-7" />
              </>
            ) : failed ? (
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="m8 8 8 8m0-8-8 8" />
              </>
            ) : (
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </>
            )}
          </svg>
        </div>
        <h1 className="mb-4 text-2xl font-bold">
          {paid
            ? "پرداخت با موفقیت انجام شد"
            : failed
              ? "پرداخت انجام نشد"
              : "سفارش در انتظار پرداخت است"}
        </h1>
        <p className="text-sm leading-7 text-muted">
          {paid
            ? "سفارش شما ثبت شد و در حال آماده‌سازی است."
            : failed
              ? "سفارش لغو شد و موجودی محصولات آزاد شد. می‌توانید دوباره خرید کنید."
              : "پرداخت این سفارش هنوز تأیید نشده است."}
        </p>
        <dl className="my-8 grid gap-4 rounded-xl border border-border p-5 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <dt>شمارهٔ سفارش</dt>
            <dd dir="ltr" data-order-number={order.orderNumber}>
              <CopyOrderNumber number={order.orderNumber} />
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt>تاریخ ثبت</dt>
            <dd>{formatDate(order.createdAt)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt>مبلغ سفارش</dt>
            <dd>{formatPrice(order.total)}</dd>
          </div>
          {order.payment.refId && (
            <div className="grid gap-2">
              <dt>کد پیگیری پرداخت</dt>
              <dd dir="ltr" className="text-start break-all">
                {toPersianDigits(order.payment.refId)}
              </dd>
            </div>
          )}
        </dl>
        <div className="flex flex-wrap gap-3">
          <Link href={`/account/orders/${order.id}`} className="checkout-link">
            مشاهدهٔ سفارش
          </Link>
          <Link
            href="/products"
            className="checkout-link checkout-link-secondary"
          >
            بازگشت به فروشگاه
          </Link>
          <Link href="/cart" className="checkout-link checkout-link-secondary">
            سبد خرید
          </Link>
        </div>
      </section>
    </main>
  );
}
