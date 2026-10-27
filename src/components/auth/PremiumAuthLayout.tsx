import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Package, ShieldCheck, Sparkles } from "lucide-react";
import styles from "@/components/auth/premium-auth.module.css";

const benefits = [
  {
    icon: ShieldCheck,
    title: "خرید امن و مطمئن",
    text: "حفاظت از اطلاعات حساب کاربری",
  },
  {
    icon: Package,
    title: "پیگیری آسان سفارش‌ها",
    text: "دسترسی سریع به تاریخچه خرید",
  },
  {
    icon: Sparkles,
    title: "تجربه کاربری ساده",
    text: "طراحی شده برای خرید راحت‌تر",
  },
];

export function PremiumAuthLayout({
  children,
  register = false,
}: {
  children: ReactNode;
  register?: boolean;
}) {
  return (
    <div className={`${styles.page} ${styles.shared}`}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <Link
              href="/"
              className={styles.wordmark}
              dir="ltr"
              aria-label="لانچ‌اوکس، صفحه اصلی"
            >
              Launcho<span>X</span>
            </Link>
            <p className={styles.tagline}>
              فروشگاه تخصصی یخچال و لوازم سرمایشی
            </p>
          </div>
          <Link href="/" className={styles.back}>
            بازگشت به فروشگاه <ArrowLeft size={17} aria-hidden="true" />
          </Link>
        </div>
      </header>
      <main className={styles.main}>
        {children}
        <aside className={styles.intro} aria-labelledby="auth-benefits-title">
          <p className={styles.badge}>
            تجربه خرید هوشمندتر با <bdi>LAUNCHOX</bdi>
          </p>
          <h2 id="auth-benefits-title">
            {register ? "خریدهای بعدی،" : "خرید مطمئن،"}
            <span>{register ? "ساده‌تر از همیشه" : "تجربه‌ای ساده‌تر"}</span>
          </h2>
          <p className={styles.description}>
            {register
              ? "با ساخت حساب کاربری، سفارش‌های خود را یکجا ببینید و خریدهایتان را راحت‌تر مدیریت کنید."
              : "به حساب کاربری خود وارد شوید؛ سفارش‌ها را پیگیری کنید و خرید بعدی را سریع‌تر انجام دهید."}
          </p>
          <ul className={styles.benefits}>
            {benefits.map(({ icon: Icon, title, text }) => (
              <li key={title} className={styles.benefit}>
                <span className={styles.benefitIcon}>
                  <Icon size={23} strokeWidth={1.7} aria-hidden="true" />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className={styles.signature}>
            <bdi>LaunchoX</bdi> • فروشگاه تخصصی لوازم سرمایشی
          </p>
        </aside>
      </main>
    </div>
  );
}
