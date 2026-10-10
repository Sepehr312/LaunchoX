import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireUser } from "@/actions/auth.actions";
import { getOrderByAuthority } from "@/services/order.service";
import { requireFakePaymentEnabled } from "@/services/payment/fake.provider";
import { authoritySchema } from "@/validations/order";
import { formatPrice, toPersianDigits } from "@/lib/format";

export const metadata: Metadata = {
  title: `درگاه آزمایشی | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default async function FakeGatewayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  try {
    requireFakePaymentEnabled();
  } catch {
    notFound();
  }
  const parsed = authoritySchema.safeParse((await searchParams).authority);
  if (!parsed.success) notFound();
  const order = await getOrderByAuthority(parsed.data, user.id).catch(
    (error: unknown) => {
      if (error instanceof AppError && error.code === "NOT_FOUND") return null;
      throw error;
    },
  );
  if (!order || order.payment.provider !== "fake") notFound();
  const callback = `/api/payment/callback?authority=${parsed.data}&status=`;
  return (
    <main className="store-shell py-12">
      <section className="checkout-panel mx-auto max-w-xl">
        <p className="section-kicker">محیط آزمایشی لانچ‌اوکس</p>
        <h1 className="mt-2 mb-4 text-2xl font-bold">درگاه آزمایشی</h1>
        <p className="text-sm leading-7 text-muted">
          این پرداخت آزمایشی است و مبلغی از حساب شما کسر نمی‌شود.
        </p>
        <dl className="my-8 grid gap-4">
          <div className="flex flex-wrap justify-between gap-2">
            <dt>شمارهٔ سفارش</dt>
            <dd dir="ltr">{toPersianDigits(order.orderNumber)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4 font-bold">
            <dt>مبلغ پرداخت</dt>
            <dd>{formatPrice(order.total)}</dd>
          </div>
        </dl>
        {order.status === "pending" && order.payment.status === "unpaid" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <a href={callback + "OK"} className="checkout-link">
              پرداخت موفق
            </a>
            <a
              href={callback + "NOK"}
              className="checkout-link checkout-link-secondary"
            >
              انصراف
            </a>
          </div>
        ) : (
          <Link
            href={`/checkout/result?order=${order.orderNumber}`}
            className="checkout-link"
          >
            مشاهدهٔ نتیجهٔ پرداخت
          </Link>
        )}
      </section>
    </main>
  );
}
