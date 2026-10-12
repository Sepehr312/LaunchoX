"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Mail, MapPin, Phone, Send, Snowflake, X } from "lucide-react";
import { toPersianDigits } from "@/lib/format";
import { usePreviewTheme } from "@/components/preview/frostic/use-preview-theme";
import themeStyles from "@/components/preview/frostic/frostic-theme.module.css";
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
    text: "برای مشاوره و ارتباط با LaunchoX، از شماره تلفن یا ایمیل درج‌شده در فوتر استفاده کنید.",
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
    text: "برای دریافت راهنمای خرید و ارتباط با LaunchoX، با ما تماس بگیرید یا به info@sermayesh.ir پیام بفرستید.",
  },
} as const;

export function ArcticFooter({
  buyingGuideHref = "/#frostic-buying-guide",
}: {
  buyingGuideHref?: string;
}) {
  const { theme } = usePreviewTheme();
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<keyof typeof information>("about");
  function showInformation(key: keyof typeof information) {
    setActive(key);
    dialog.current?.showModal();
  }
  return (
    <footer
      className={`${themeStyles.theme} ${styles.footer}`}
      data-theme={theme}
      data-arctic-footer
      aria-label="پاورقی LaunchoX"
    >
      <div className={styles.landscape} aria-hidden="true" />
      <div className={styles.content}>
        <section
          className={styles.contact}
          aria-labelledby="footer-contact-title"
        >
          <h2 id="footer-contact-title">اطلاعات تماس</h2>
          <address>
            <a href="tel:0711735628">
              <Phone />
              <bdi>{toPersianDigits("071-1735628")}</bdi>
            </a>
            <a href="mailto:info@sermayesh.ir">
              <Mail />
              <bdi>info@sermayesh.ir</bdi>
            </a>
            <span>
              <MapPin />
              تهران، خیابان ولیعصر، پلاک {toPersianDigits(138)}
            </span>
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
          <button onClick={() => showInformation("support")}>
            خدمات پس از فروش
          </button>
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
          <a
            className={styles.logo}
            href="#"
            aria-label="LaunchoX، ابتدای صفحه"
          >
            <Snowflake aria-hidden="true" />
            <span>
              <strong dir="ltr">LaunchoX</strong>
              <small>انتخابی بهتر، زندگی آرام‌تر</small>
            </span>
          </a>
          <div
            className={styles.socials}
            role="group"
            aria-label="شبکه‌های اجتماعی LaunchoX"
          >
            <button
              aria-label="تلگرام LaunchoX"
              onClick={() => showInformation("social")}
            >
              <Send />
            </button>
            <button
              aria-label="اینستاگرام LaunchoX"
              onClick={() => showInformation("social")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle
                  cx="17.5"
                  cy="6.5"
                  r="1"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className={styles.copyright}>
        <p>
          © {toPersianDigits(1405)} <bdi>LaunchoX</bdi>؛ همهٔ حقوق محفوظ است.
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
        <p>{information[active].text}</p>
        <a href="mailto:info@sermayesh.ir">ارتباط با LaunchoX</a>
      </dialog>
    </footer>
  );
}
