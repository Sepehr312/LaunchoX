"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Mail, MapPin, Phone, Snowflake, X } from "lucide-react";
import { toPersianDigits } from "@/lib/format";
import themeStyles from "@/components/store/frostic/frostic-theme.module.css";
import styles from "./ArcticFooter.module.css";

const information = {
  magazine: {
    title: "مجله خرید",
    text: "برای انتخاب یخچال، ابتدا فضای نصب، ظرفیت مورد نیاز خانواده و مصرف انرژی را بررسی کنید. راهنمای خرید به شما کمک می‌کند انتخاب دقیق‌تری داشته باشید.",
  },
  about: {
    title: "درباره ما",
    text: "LaunchoX، فروشگاه تخصصی یخچال؛ همراه شما برای انتخابی مطمئن و خانه‌ای آرام‌تر.",
  },
  contact: {
    title: "تماس با ما",
    text: "راه‌های ارتباطی رسمی فروشگاه پس از تأیید در این بخش منتشر می‌شوند.",
  },
  questions: {
    title: "پرسش‌های متداول",
    text: "ظرفیت، ابعاد محل نصب، مصرف انرژی و شرایط گارانتی را پیش از خرید بررسی کنید. برای دریافت مشاوره با ما تماس بگیرید.",
  },
  returns: {
    title: "شرایط بازگشت کالا",
    text: "پیش از بازگرداندن کالا، با پشتیبانی تماس بگیرید تا شرایط سفارش و وضعیت کالا بررسی شود.",
  },
  support: {
    title: "خدمات پس از فروش",
    text: "برای راهنمایی درباره نصب، گارانتی و خدمات محصول، با پشتیبانی LaunchoX در ارتباط باشید.",
  },
  social: {
    title: "همراه LaunchoX باشید",
    text: "شبکه‌های اجتماعی رسمی فروشگاه هنوز منتشر نشده‌اند.",
  },
} as const;

export function ArcticFooter({
  site,
  buyingGuideHref = "/#frostic-buying-guide",
}: {
  site: {
    name: string;
    phone: string;
    email: string;
    address: string;
    year: string;
  };
  buyingGuideHref?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<keyof typeof information>("about");
  function showInformation(key: keyof typeof information) {
    setActive(key);
    dialog.current?.showModal();
  }
  return (
    <footer
      className={`${themeStyles.theme} ${styles.footer}`}
      data-arctic-footer
      aria-label={`پاورقی ${site.name}`}
    >
      <div className={styles.landscape} aria-hidden="true" />
      <div className={styles.content}>
        <section
          className={styles.contact}
          aria-labelledby="footer-contact-title"
        >
          <h2 id="footer-contact-title">اطلاعات تماس</h2>
          <address>
            {site.phone && (
              <a href={`tel:${site.phone.replace(/[^+0-9]/g, "")}`}>
                <Phone />
                <bdi>{toPersianDigits(site.phone)}</bdi>
              </a>
            )}
            {site.email && (
              <a href={`mailto:${site.email}`}>
                <Mail />
                <bdi>{site.email}</bdi>
              </a>
            )}
            {site.address && (
              <span>
                <MapPin />
                {toPersianDigits(site.address)}
              </span>
            )}
            {!site.phone && !site.email && !site.address && (
              <span>اطلاعات تماس رسمی هنوز منتشر نشده است.</span>
            )}
          </address>
        </section>
        <nav
          className={styles.services}
          aria-labelledby="footer-services-title"
        >
          <h2 id="footer-services-title">خدمات مشتریان</h2>
          <button onClick={() => showInformation("questions")}>
            پرسش‌های متداول
          </button>
          <button onClick={() => showInformation("returns")}>
            شرایط بازگشت کالا
          </button>
          <Link href="/services">خدمات پس از فروش</Link>
          <Link href={buyingGuideHref}>راهنمای خرید</Link>
        </nav>
        <nav className={styles.quick} aria-labelledby="footer-quick-title">
          <h2 id="footer-quick-title">دسترسی سریع</h2>
          <Link href="/products">محصولات</Link>
          <button onClick={() => showInformation("magazine")}>مجله خرید</button>
          <button onClick={() => showInformation("about")}>درباره ما</button>
          <button onClick={() => showInformation("contact")}>تماس با ما</button>
        </nav>
        <div className={styles.brand}>
          <Link
            className={styles.logo}
            href="/"
            aria-label={`${site.name}، صفحه اصلی`}
          >
            <Snowflake aria-hidden="true" />
            <span>
              <strong dir="auto">{site.name}</strong>
              <small>انتخابی بهتر، زندگی آرام‌تر</small>
            </span>
          </Link>
        </div>
      </div>
      <div className={styles.copyright}>
        <p>
          © {site.year} <bdi>{site.name}</bdi>؛ همهٔ حقوق محفوظ است.
        </p>
      </div>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="footer-dialog-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <button
          className={styles.close}
          aria-label="بستن"
          onClick={() => dialog.current?.close()}
        >
          <X />
        </button>
        <h2 id="footer-dialog-title">{information[active].title}</h2>
        <p>{information[active].text.replaceAll("LaunchoX", site.name)}</p>
        {site.email && (
          <a href={`mailto:${site.email}`}>ارتباط با {site.name}</a>
        )}
      </dialog>
    </footer>
  );
}
