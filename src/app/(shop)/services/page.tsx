import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  Check,
  ClipboardList,
  Headphones,
  Mail,
  MessageCircle,
  PackageCheck,
  Phone,
  ShieldCheck,
  Snowflake,
  Wrench,
} from "lucide-react";
import { toPersianDigits } from "@/lib/format";
import styles from "./services.module.css";

export const metadata: Metadata = {
  title: "خدمات و پشتیبانی | لانچ‌اوکس",
  description:
    "راهنمای انتخاب یخچال، تحویل، نصب و پیگیری گارانتی؛ راه‌های ارتباط با پشتیبانی لانچ‌اوکس و دسترسی به سفارش‌های شما.",
};

const services = [
  {
    id: "buying",
    icon: MessageCircle,
    title: "مشاوره پیش از خرید",
    text: "از ابعاد آشپزخانه تا نیاز خانواده؛ انتخاب را با شناخت جزئیات شروع کنید.",
    action: "راهنمای انتخاب",
    label: "پیش از خرید",
    tips: [
      "عرض، ارتفاع و عمق محل قرارگیری را اندازه بگیرید و فضای بازشدن در و تهویه را مطابق راهنمای مدل در نظر بگیرید.",
      "ظرفیت، مصرف انرژی و امکانات مدل‌ها را در صفحه محصول و بخش مقایسه بررسی کنید.",
      "برای مشاوره، ابعاد محل نصب، بودجه و مدل‌های موردنظرتان را هنگام تماس آماده داشته باشید.",
    ],
  },
  {
    id: "delivery",
    icon: PackageCheck,
    title: "راهنمای تحویل",
    text: "با آماده‌کردن مسیر ورود و بررسی کالا، برای تحویل سفارش آماده باشید.",
    action: "نکات تحویل کالا",
    label: "هنگام تحویل",
    tips: [
      "پیش از تحویل، ابعاد درها، راه‌پله و آسانسور را با ابعاد بسته‌بندی محصول تطبیق دهید.",
      "مشخصات سفارش و وضعیت ظاهری بسته‌بندی را هنگام تحویل بررسی کنید و هر مغایرت یا آسیب را ثبت و به پشتیبانی اعلام کنید.",
      "زمان و شرایط حمل سفارش خود را از پشتیبانی پیگیری کنید؛ شرایط هر سفارش ممکن است متفاوت باشد.",
    ],
  },
  {
    id: "installation",
    icon: Wrench,
    title: "نصب و راه‌اندازی",
    text: "مسیر هماهنگی با خدمات مجاز برند و نکات آماده‌سازی محل نصب را بشناسید.",
    action: "دیدن راهنمای نصب",
    label: "پیش از راه‌اندازی",
    tips: [
      "پیش از بازکردن بسته‌بندی و روشن‌کردن دستگاه، دستورالعمل سازنده و شرایط شرکت گارانتی‌کننده را بررسی کنید.",
      "اگر فعال‌سازی ضمانت به نصب مجاز وابسته است، از طریق اطلاعات درج‌شده روی ضمانت‌نامه با خدمات مجاز همان برند هماهنگ کنید.",
      "فاصله تهویه، شرایط برق و زمان مناسب روشن‌کردن پس از جابه‌جایی را از دفترچه همان مدل یا نصاب مجاز بپرسید.",
    ],
  },
  {
    id: "warranty",
    icon: ShieldCheck,
    title: "گارانتی و پشتیبانی",
    text: "شرایط ضمانت محصول و راه مناسب پیگیری پرسش‌ها یا مشکلات را پیدا کنید.",
    action: "راهنمای پیگیری گارانتی",
    label: "پس از خرید",
    tips: [
      "نام شرکت ضمانت‌کننده، مدت و شرایط پوشش را در صفحه محصول و ضمانت‌نامه همان کالا بررسی کنید.",
      "برای پیگیری مشکل فنی، مدل دستگاه، شماره سریال، ضمانت‌نامه و شرح مشکل را برای خدمات مجاز برند آماده کنید.",
      "برای پرسش درباره سفارش یا راهنمایی مسیر پیگیری، با پشتیبانی لانچ‌اوکس تماس بگیرید. نصب و تعمیر تابع شرایط خدمات مجاز برند است.",
    ],
  },
];

const questions = [
  {
    title: "برای انتخاب یخچال مناسب از کجا شروع کنم؟",
    text: "ابعاد محل نصب، تعداد اعضای خانواده و بودجه را مشخص کنید. سپس مشخصات مدل‌ها را در بخش محصولات و مقایسه ببینید؛ برای پرسش‌های بیشتر می‌توانید با پشتیبانی تماس بگیرید.",
  },
  {
    title: "نصب یخچال را چه کسی انجام می‌دهد؟",
    text: "شرایط نصب به برند و شرکت ضمانت‌کننده بستگی دارد. پیش از بازکردن بسته‌بندی، ضمانت‌نامه را بخوانید و در صورت نیاز با خدمات مجاز همان برند هماهنگ کنید.",
  },
  {
    title: "اطلاعات گارانتی محصول را کجا ببینم؟",
    text: "اطلاعات درج‌شده در صفحه همان محصول و ضمانت‌نامه همراه کالا را بررسی کنید. برای ابهام در مشخصات اعلام‌شده می‌توانید از پشتیبانی فروشگاه راهنمایی بگیرید.",
  },
  {
    title: "وضعیت سفارش را چطور پیگیری کنم؟",
    text: "وارد حساب کاربری شوید و از بخش «سفارش‌های من» جزئیات و وضعیت سفارش را ببینید. برای پیگیری تلفنی، شماره سفارش را آماده داشته باشید.",
  },
  {
    title: "اگر کالا آسیب‌دیده یا با سفارش متفاوت بود چه کنم؟",
    text: "آسیب یا مغایرت را ثبت کنید و پیش از نصب یا بازگرداندن کالا با پشتیبانی تماس بگیرید تا وضعیت سفارش و مسیر رسیدگی بررسی شود.",
  },
];

export default function ServicesPage() {
  return (
    <main className={styles.page}>
      <div className="store-shell">
        <nav className={styles.breadcrumb} aria-label="مسیر صفحه">
          <Link href="/">خانه</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">خدمات و پشتیبانی</span>
        </nav>
        <section className={styles.hero} aria-labelledby="services-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <Snowflake size={18} aria-hidden="true" /> همراه شما، در هر قدم
            </p>
            <h1 id="services-title">
              از انتخاب تا پشتیبانی،
              <br />
              <span>کنار شما هستیم.</span>
            </h1>
            <p className={styles.lead}>
              یک انتخاب خوب، با خیال آسوده کامل می‌شود. راهنمای خرید، تحویل و
              خدمات محصول را اینجا پیدا کنید و هر جا پرسشی داشتید، با ما در
              ارتباط باشید.
            </p>
            <div className={styles.actions}>
              <a href="#support-contact" className={styles.primary}>
                <Headphones size={20} aria-hidden="true" /> تماس با پشتیبانی
              </a>
              <a href="#our-services" className={styles.secondary}>
                خدمات را ببینید <ArrowDown size={18} aria-hidden="true" />
              </a>
            </div>
            <p className={styles.heroNote}>
              <Check size={16} aria-hidden="true" /> راهنمایی روشن، متناسب با
              محصول و سفارش شما
            </p>
          </div>
          <div className={styles.visual}>
            <div className={styles.visualGlow} aria-hidden="true" />
            <Image
              src="/images/preview/categories/side-by-side.png"
              alt="یخچال ساید بای ساید لانچ‌اوکس"
              width={560}
              height={560}
              sizes="(max-width: 767px) 85vw, 40vw"
              className={styles.product}
              priority
            />
            <div className={styles.visualBadge}>
              <ShieldCheck size={28} aria-hidden="true" />
              <span>
                <strong>همراهی پس از انتخاب</strong>
                <small>راهنمای تحویل، نصب و ضمانت</small>
              </span>
            </div>
          </div>
        </section>

        <section
          id="our-services"
          className={styles.section}
          aria-labelledby="our-services-title"
        >
          <p className={styles.eyebrow}>چطور می‌توانیم کمک کنیم؟</p>
          <h2 id="our-services-title">برای هر مرحله، یک راه روشن</h2>
          <div className={styles.cards}>
            {services.map(({ id, icon: Icon, title, text, action, label }) => (
              <article key={id} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.icon}>
                    <Icon size={25} strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <span className={styles.tag}>{label}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <a href={`#guide-${id}`} className={styles.textLink}>
                  {action}
                  <ArrowLeft size={17} aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section
          className={styles.orderPanel}
          aria-labelledby="order-support-title"
        >
          <span className={styles.orderIcon}>
            <ClipboardList size={34} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div>
            <p className={styles.eyebrow}>قبلاً از ما خرید کرده‌اید؟</p>
            <h2 id="order-support-title">برای سفارش قبلی کمک می‌خواهید؟</h2>
            <p>
              وضعیت و جزئیات سفارش را در حساب خود ببینید یا برای راهنمایی با ما
              تماس بگیرید.
            </p>
          </div>
          <div className={styles.orderActions}>
            <Link href="/account/orders" className={styles.primary}>
              سفارش‌های من <ArrowLeft size={18} aria-hidden="true" />
            </Link>
            <a href="#support-contact" className={styles.textLink}>
              ارتباط با پشتیبانی
            </a>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="guides-title">
          <div className={styles.guideLayout}>
            <div>
              <p className={styles.eyebrow}>جزئیات کوچک، آرامش بیشتر</p>
              <h2 id="guides-title">راهنمای قدم بعدی شما</h2>
              <p className={styles.lead}>
                بخش مرتبط با نیازتان را باز کنید؛ نکات مهم هر مرحله را یک‌جا
                آورده‌ایم.
              </p>
              <Link href="/compare" className={styles.textLink}>
                مقایسه مدل‌های یخچال <ArrowLeft size={18} aria-hidden="true" />
              </Link>
            </div>
            <div className={styles.guides}>
              {services.map(({ id, icon: Icon, title, tips }) => (
                <details id={`guide-${id}`} className={styles.details} key={id}>
                  <summary>
                    <Icon size={21} aria-hidden="true" />
                    <span>{title}</span>
                    <span className={styles.plus} aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <ul>
                    {tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section
          className={styles.faqSection}
          aria-labelledby="services-faq-title"
        >
          <p className={styles.eyebrow}>شاید پرسش شما هم باشد</p>
          <h2 id="services-faq-title">پرسش‌های پرتکرار</h2>
          <div className={styles.faq}>
            {questions.map(({ title, text }) => (
              <details className={styles.details} key={title}>
                <summary>
                  <span>{title}</span>
                  <span className={styles.plus} aria-hidden="true">
                    +
                  </span>
                </summary>
                <p>{text}</p>
              </details>
            ))}
          </div>
        </section>

        <section
          id="support-contact"
          className={styles.contact}
          aria-labelledby="support-contact-title"
        >
          <div>
            <p className={styles.eyebrow}>
              <Headphones size={19} aria-hidden="true" /> یک گفت‌وگو تا قدم بعدی
            </p>
            <h2 id="support-contact-title">
              هنوز پرسشی دارید؟ با ما در ارتباط باشید.
            </h2>
            <p>
              برای پیگیری سریع‌تر، شماره سفارش و مدل محصول را آماده داشته باشید.
            </p>
          </div>
          <address className={styles.contactLinks}>
            <a href="tel:0711735628">
              <Phone size={21} aria-hidden="true" />
              <span>
                <small>تماس با پشتیبانی</small>
                <bdi>{toPersianDigits("071-1735628")}</bdi>
              </span>
              <ArrowLeft size={18} aria-hidden="true" />
            </a>
            <a href="mailto:info@sermayesh.ir">
              <Mail size={21} aria-hidden="true" />
              <span>
                <small>ایمیل پشتیبانی</small>
                <bdi>info@sermayesh.ir</bdi>
              </span>
              <ArrowLeft size={18} aria-hidden="true" />
            </a>
          </address>
        </section>
      </div>
    </main>
  );
}
