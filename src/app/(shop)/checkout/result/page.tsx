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
  const failed = order.status === "cancelled";
  return (
    <main className="store-shell py-12">
      <section className="checkout-panel mx-auto max-w-2xl">
        <p className="section-kicker">نتیجهٔ سفارش شما</p>
        <div
          aria-hidden="true"
          className={
            paid
              ? "checkout-result-symbol text-success"
              : "checkout-result-symbol text-danger"
          }
        >
          {paid ? "✓" : failed ? "×" : "…"}
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
              {toPersianDigits(order.orderNumber)}
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
          <Link href="/products" className="checkout-link">
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
