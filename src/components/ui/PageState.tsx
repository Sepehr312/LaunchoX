import Link from "next/link";
import type { ReactNode } from "react";
type PageStateProps = {
  symbol: string;
  title: string;
  description: string;
  children?: ReactNode;
};
export function PageState({
  symbol,
  title,
  description,
  children,
}: PageStateProps) {
  return (
    <section
      dir="rtl"
      className="page-state"
      aria-labelledby="page-state-title"
    >
      <div className="page-state-panel">
        <p className="text-sm font-bold text-primary">لانچ‌اوکس</p>
        <div className="page-state-symbol" aria-hidden="true">
          {symbol}
        </div>
        <h1
          id="page-state-title"
          className="text-2xl leading-relaxed font-black sm:text-3xl"
        >
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-8 text-muted sm:text-base">
          {description}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          {children}
          <Link href="/" className="checkout-link">
            بازگشت به صفحهٔ اصلی
          </Link>
          <Link
            href="/products"
            className="checkout-link checkout-link-secondary"
          >
            مشاهدهٔ محصولات
          </Link>
        </div>
      </div>
    </section>
  );
}
