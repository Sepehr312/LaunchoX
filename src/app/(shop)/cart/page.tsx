import { CustomerScope } from "@/components/customer/CustomerScope";
import { CustomerEmpty } from "@/components/customer/CustomerEmpty";
import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getCurrentCart } from "@/actions/cart.actions";
import { CartForm } from "@/components/store/CartForm";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = {
  title: `سبد خرید | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};

export default async function CartPage() {
  const cart = await getCurrentCart();
  return (
    <CustomerScope>
      <main className="store-shell py-8 sm:py-12">
        <p className="section-kicker">انتخاب‌های شما</p>
        <h1 className="mb-8 text-3xl font-bold">سبد خرید</h1>
        {cart.warnings.map((warning, index) => (
          <p
            key={index}
            role="status"
            className="mb-3 rounded-xl border border-border bg-surface p-4 text-sm"
          >
            {warning}
          </p>
        ))}
        {!cart.items.length ? (
          <CustomerEmpty
            title="سبد خرید شما خالی است"
            description="محصول دلخواهتان را انتخاب کنید؛ انتخاب‌هایتان اینجا نمایش داده می‌شود."
            href="/products"
            label="مشاهدهٔ محصولات"
          />
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section aria-label="اقلام سبد" className="grid min-w-0 gap-4">
              {cart.items.map((item) => (
                <article
                  key={item.product.id}
                  data-cart-item
                  className="checkout-panel"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.title}
                      width={80}
                      height={100}
                      className="h-24 w-16 shrink-0 object-contain"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="font-semibold"
                      >
                        {item.product.title}
                      </Link>
                      <p className="mt-2 text-sm text-muted">
                        قیمت واحد: {formatPrice(item.product.price)}
                      </p>
                    </div>
                  </div>
                  <CartForm
                    mode="update"
                    product={item.product.id}
                    quantity={item.quantity}
                    stock={item.product.stock}
                  />
                  <p className="font-semibold">
                    جمع محصول: {formatPrice(item.lineTotal)}
                  </p>
                  <CartForm
                    mode="remove"
                    product={item.product.id}
                    stock={item.product.stock}
                  />
                </article>
              ))}
            </section>
            <aside className="checkout-panel lg:sticky lg:top-28">
              <h2 className="mb-6 text-xl font-semibold">خلاصهٔ سبد</h2>
              <dl className="grid gap-4 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <dt>جمع جزء</dt>
                  <dd>{formatPrice(cart.subtotal)}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt>هزینهٔ ارسال</dt>
                  <dd>
                    {cart.shippingFee
                      ? formatPrice(cart.shippingFee)
                      : "رایگان"}
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4 font-bold">
                  <dt>جمع کل</dt>
                  <dd>{formatPrice(cart.total)}</dd>
                </div>
              </dl>
              <Link
                href="/checkout"
                className="mt-6 flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
              >
                ادامه فرآیند خرید
              </Link>
            </aside>
          </div>
        )}
      </main>
    </CustomerScope>
  );
}
