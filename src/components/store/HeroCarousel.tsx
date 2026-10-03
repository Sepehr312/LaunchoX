"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronIcon, SnowflakeIcon } from "@/components/store/Icons";
import { toPersianDigits } from "@/lib/format";

const slides = [
  {
    eyebrow: "فناوری در خدمت تازگی",
    title: "یخچال‌هایی فراتر از انتظار",
    description:
      "ترکیب طراحی مینیمال، سرمایش دقیق و مصرف انرژی هوشمند برای خانه‌های امروز.",
    primary: "مشاهده محصولات",
    href: "/products",
  },
  {
    eyebrow: "هوای تازه در هر طبقه",
    title: "سرمایش یکنواخت، ماندگاری بیشتر",
    description:
      "مدل‌های منتخب با گردش هوای چندگانه و فضای داخلی مهندسی‌شده را مقایسه کنید.",
    primary: "مدل‌های ویژه",
    href: "/products?sort=bestselling",
  },
  {
    eyebrow: "نمایشگاه تخصصی سرمایش",
    title: "انتخاب دقیق برای سبک زندگی شما",
    description:
      "از یخچال‌های کم‌جا تا مدل‌های سایدبای‌ساید؛ مشخصات واقعی در یک نگاه.",
    primary: "شروع انتخاب",
    href: "/search",
  },
];

export function HeroCarousel() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % slides.length),
      7000,
    );
    return () => window.clearInterval(timer);
  }, []);
  const slide = slides[active];
  const move = (direction: number) =>
    setActive(
      (current) => (current + direction + slides.length) % slides.length,
    );

  return (
    <section
      className="hero-carousel"
      aria-roledescription="carousel"
      aria-label="پیشنهادهای ویژه"
    >
      <div className="hero-visual" aria-hidden="true">
        <Image
          src="/images/arctic-showroom-light.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hero-image hero-image-light"
        />
        <Image
          src="/images/arctic-showroom-dark.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hero-image hero-image-dark"
        />
      </div>
      <div className="hero-shade" />
      <div className="store-shell relative z-10 flex min-h-[680px] items-end py-8 sm:min-h-[720px] sm:py-12 lg:min-h-[650px] lg:items-center lg:py-24">
        <div className="hero-copy" aria-live="polite">
          <p className="hero-eyebrow">
            <SnowflakeIcon className="size-5" />
            {slide.eyebrow}
          </p>
          <h1>{slide.title}</h1>
          <p className="hero-description">{slide.description}</p>
          <div className="mt-7 flex flex-col gap-3 min-[390px]:flex-row">
            <Link href={slide.href} className="hero-cta hero-cta-primary">
              {slide.primary}
              <ChevronIcon className="size-5" />
            </Link>
            <Link
              href="/products?inStock=true"
              className="hero-cta hero-cta-secondary"
            >
              فقط کالاهای موجود
            </Link>
          </div>
        </div>
      </div>
      <div className="hero-controls">
        <button type="button" onClick={() => move(-1)} aria-label="اسلاید قبلی">
          <ChevronIcon className="size-5 rotate-180" />
        </button>
        <div
          className="flex items-center gap-2"
          role="tablist"
          aria-label="انتخاب اسلاید"
        >
          {slides.map((item, index) => (
            <button
              key={item.title}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`اسلاید ${toPersianDigits(index + 1)}`}
              className={index === active ? "active" : undefined}
              onClick={() => setActive(index)}
            />
          ))}
        </div>
        <button type="button" onClick={() => move(1)} aria-label="اسلاید بعدی">
          <ChevronIcon className="size-5" />
        </button>
      </div>
      <p className="hero-counter" aria-hidden="true">
        <strong>{toPersianDigits(active + 1).padStart(2, "۰")}</strong>
        <span />
        {toPersianDigits(slides.length).padStart(2, "۰")}
      </p>
    </section>
  );
}
