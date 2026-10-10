import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/actions/auth.actions";
import { getCurrentCart } from "@/actions/cart.actions";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getCheckoutAddresses } from "@/services/user.service";
import { formatPrice, toPersianDigits } from "@/lib/format";

export const metadata: Metadata = {
  title: `تسویه‌حساب | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};

export default async function CheckoutPage() {
  const user = await requireUser();
  const [cart, addresses] = await Promise.all([
    getCurrentCart(),
    getCheckoutAddresses(user.id),
  ]);
  return (
    <main className="store-shell py-8 sm:py-12">
      <p className="section-kicker">آخرین قدم تا یک انتخاب ماندگار</p>
      <h1 className="mt-2 mb-3 text-3xl font-bold sm:text-4xl">تسویه‌حساب</h1>
      <p className="mb-8 text-sm leading-7 text-muted">
        آدرس ارسال را انتخاب کنید و سفارش خود را نهایی کنید.
      </p>
      {!cart.items.length ? (
        <section className="checkout-panel">
          <p className="mb-4">سبد خرید شما خالی است.</p>
          <Link href="/products" className="text-primary">
            مشاهدهٔ محصولات
          </Link>
        </section>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            {cart.warnings.map((warning, index) => (
              <p
                key={index}
                role="status"
                className="mb-3 rounded-xl border border-border p-4 text-sm"
              >
                {warning}
              </p>
            ))}
            <CheckoutForm addresses={addresses} />
          </div>
          <aside className="checkout-panel lg:sticky lg:top-28">
            <p className="section-kicker">با دقت انتخاب شده</p>
            <h2 className="mt-2 mb-6 text-xl font-bold">خلاصهٔ سفارش</h2>
            <div className="grid gap-5">
              {cart.items.map((item) => (
                <article
                  key={item.product.id}
                  className="flex min-w-0 items-center gap-4 border-b border-border pb-5"
                >
                  <Image
                    src={item.product.images[0]}
                    alt={item.product.title}
                    width={64}
                    height={80}
                    className="h-20 w-14 shrink-0 object-contain"
                  />
                  <div className="min-w-0">
                    <p className="text-sm leading-7 font-semibold">
                      {item.product.title}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {toPersianDigits(item.quantity)} عدد ·{" "}
                      {formatPrice(item.product.price)}
                    </p>
                    <p className="mt-2 text-sm font-bold">
                      {formatPrice(item.lineTotal)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
            <dl className="mt-6 grid gap-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <dt>جمع اقلام</dt>
                <dd>{formatPrice(cart.subtotal)}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt>هزینهٔ ارسال</dt>
                <dd>
                  {cart.shippingFee ? formatPrice(cart.shippingFee) : "رایگان"}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-5 text-base font-bold">
                <dt>مبلغ پرداخت</dt>
                <dd>{formatPrice(cart.total)}</dd>
              </div>
            </dl>
            <Link href="/cart" className="mt-6 block text-sm text-primary">
              بازگشت و ویرایش سبد
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}
