import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowDown,
  Compass,
  Headphones,
  Layers,
  Leaf,
  ListChecks,
  Ruler,
  Snowflake,
  Volume2,
} from "lucide-react";
import { SectionHeading } from "@/components/store/SectionHeading";
import { AboutReveal } from "./AboutReveal";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "درباره ما | لانچ‌اوکس",
  description:
    "با نگاه لانچ‌اوکس به انتخاب آگاهانه یخچال آشنا شوید؛ توجه به نیاز خانه، مشخصات روشن و خریدی سنجیده‌تر.",
};

const values = [
  {
    icon: Compass,
    title: "راهنمایی برای انتخاب بهتر",
    text: "انتخاب از نیاز شما شروع می‌شود؛ از فضای آشپزخانه تا عادت خرید و نگهداری مواد غذایی.",
  },
  {
    icon: Layers,
    title: "تنوع محصولات و برندها",
    text: "مدل‌ها و برندهای مختلف را ببینید و گزینه‌ای متناسب با سلیقه، فضا و بودجه‌تان پیدا کنید.",
  },
  {
    icon: ListChecks,
    title: "اطلاعات شفاف و قابل‌مقایسه",
    text: "مشخصات درج‌شده در صفحه هر محصول را بررسی کنید تا تفاوت مدل‌ها برایتان روشن‌تر شود.",
  },
  {
    icon: Headphones,
    title: "اهمیت ارتباط و پشتیبانی مشتری",
    text: "پرسش‌های شما بخشی از مسیر انتخاب‌اند. راه‌های ارتباط با فروشگاه همیشه در دسترس شماست.",
  },
];

const considerations = [
  {
    icon: Ruler,
    title: "ابعاد و ظرفیت",
    text: "متناسب با فضای خانه و نیاز خانواده",
  },
  {
    icon: Leaf,
    title: "مصرف انرژی",
    text: "توجه به برچسب انرژی و مصرف روزمره",
  },
  {
    icon: Volume2,
    title: "صدا و فناوری سرمایش",
    text: "بررسی ویژگی‌های درج‌شده برای هر مدل",
  },
];

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="about-title">
        <div className={`store-shell ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <Snowflake size={20} aria-hidden="true" /> درباره لانچ‌اوکس
            </p>
            <h1 id="about-title">
              سرمایی مطمئن،
              <br />
              <span>انتخابی هوشمندانه</span>
            </h1>
            <p className={styles.description}>
              یخچال، بخشی از زندگی هر روز ماست. در لانچ‌اوکس کمک می‌کنیم با
              شناخت نیاز خانه و دیدن جزئیات، انتخابی آگاهانه و متناسب با
              زندگی‌تان داشته باشید.
            </p>
            <div className={styles.actions}>
              <Link href="/products" className="hero-cta hero-cta-primary">
                مشاهده محصولات <ArrowLeft size={20} aria-hidden="true" />
              </Link>
              <a href="#about-story" className={styles.storyLink}>
                با ما آشنا شوید <ArrowDown size={18} aria-hidden="true" />
              </a>
            </div>
            <p className={styles.heroNote}>
              نگاهی روشن به انتخاب، با توجه به جزئیات
            </p>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.orbit} aria-hidden="true" />
            <Image
              src="/images/preview/categories/french-door.png"
              alt="یخچال نقره‌ای فرنچ دور با کشوی فریزر"
              width={1080}
              height={1440}
              sizes="(max-width: 767px) 80vw, 36vw"
              preload
              className={styles.heroProduct}
            />
            <div className={styles.visualCaption}>
              <Snowflake size={24} aria-hidden="true" />
              <span>
                انتخابی برای خانه شما<small>زیبایی در کنار کارایی</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      <AboutReveal>
        <section
          id="about-story"
          className={`store-shell ${styles.section} ${styles.story}`}
          data-about-reveal
          aria-labelledby="about-story-title"
        >
          <div className={styles.storyCopy}>
            <p className={styles.eyebrow}>از یک نیاز ساده شروع می‌کنیم</p>
            <h2 id="about-story-title">داستان ما</h2>
            <p>
              پیدا کردن یخچال مناسب، میان نام مدل‌ها و فهرست بلند ویژگی‌ها،
              همیشه ساده نیست. نگاه لانچ‌اوکس از همین نیاز شکل می‌گیرد: ساده‌تر
              کردن مسیر انتخاب، بدون گم‌شدن در جزئیات.
            </p>
            <p>
              می‌خواهیم محصولات را با اطلاعات روشن ببینید، تفاوت‌ها را بهتر
              بشناسید و پیش از خرید، به نیاز واقعی خانه‌تان فکر کنید؛ از فضای
              نصب تا ظرفیت و مصرف انرژی.
            </p>
            <p>
              برای ما، خرید آگاهانه یعنی انتخابی که دلیلش را می‌دانید و با سبک
              زندگی شما هماهنگ است.
            </p>
          </div>
          <figure className={styles.storyVisual}>
            <Image
              src="/images/arctic-showroom-light.webp"
              alt="نمای یخچال در فضایی روشن با چشم‌انداز کوهستان یخی"
              fill
              sizes="(max-width: 1440px) 100vw, 1440px"
              className={styles.storyImage}
            />
          </figure>
        </section>

        <section
          className={`store-shell ${styles.section}`}
          data-about-reveal
          aria-label="چرا ما را انتخاب کنید؟"
        >
          <SectionHeading
            eyebrow="همراه مسیر انتخاب شما"
            title="چرا ما را انتخاب کنید؟"
            description="چیزهایی که در یک انتخاب سنجیده برای ما اهمیت دارند."
          />
          <div className={styles.values}>
            {values.map(({ icon: Icon, title, text }) => (
              <article key={title} className={styles.valueCard}>
                <span className={styles.iconBox}>
                  <Icon size={28} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className={`store-shell ${styles.section}`}
          data-about-reveal
          aria-labelledby="about-commitment-title"
        >
          <div className={styles.commitment}>
            <div>
              <p className={styles.eyebrow}>تعهد ما به انتخاب بهتر</p>
              <h2 id="about-commitment-title">
                انتخاب خوب،
                <br />
                از شناخت جزئیات شروع می‌شود.
              </h2>
              <p className={styles.description}>
                ظاهر، شروع آشنایی با یک یخچال است. ابعاد، ظرفیت، مصرف انرژی و
                فناوری سرمایش کمک می‌کنند ببینید کدام مدل برای خانه شما مناسب‌تر
                است. پیش از تصمیم، مشخصات هر محصول را با دقت بخوانید.
              </p>
              <Link href="/products" className="hero-cta hero-cta-secondary">
                بررسی محصولات و مشخصات{" "}
                <ArrowLeft size={20} aria-hidden="true" />
              </Link>
            </div>
            <div className={styles.specPanel}>
              <div className={styles.specHeading}>
                <Snowflake size={24} aria-hidden="true" />
                <span>پیش از انتخاب، به این‌ها توجه کنید</span>
              </div>
              {considerations.map(({ icon: Icon, title, text }) => (
                <div className={styles.specRow} key={title}>
                  <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
              <p className={styles.specNote}>
                ملاک بررسی، مشخصات درج‌شده برای همان محصول است.
              </p>
            </div>
          </div>
        </section>

        <section
          className={`store-shell ${styles.section} ${styles.finalSection}`}
          data-about-reveal
          aria-labelledby="about-cta-title"
        >
          <div className={styles.cta}>
            <Snowflake
              className={styles.ctaSnowflake}
              size={180}
              strokeWidth={0.7}
              aria-hidden="true"
            />
            <p className={styles.eyebrow}>قدم بعدی، انتخاب شماست</p>
            <h2 id="about-cta-title">برای انتخاب یخچال مناسب آماده‌اید؟</h2>
            <p className={styles.description}>
              مدل‌ها را ببینید، جزئیات را بررسی کنید و اگر پرسشی دارید، با ما در
              ارتباط باشید.
            </p>
            <div className={styles.actions}>
              <Link href="/products" className="hero-cta hero-cta-primary">
                مشاهده محصولات <ArrowLeft size={20} aria-hidden="true" />
              </Link>
              <a
                href="#footer-contact-title"
                className="hero-cta hero-cta-secondary"
              >
                تماس با ما <Headphones size={20} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </AboutReveal>
    </main>
  );
}
