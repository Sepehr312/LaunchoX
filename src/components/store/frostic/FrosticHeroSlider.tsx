"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { toPersianDigits } from "@/lib/format";
import styles from "./FrosticHeroSlider.module.css";

export interface FrosticHeroSlide {
  id: string;
  dayImage: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
}

const defaultSlides: readonly FrosticHeroSlide[] = [
  {
    id: "freshness",
    dayImage: "/images/arctic-showroom-light.webp",
    eyebrow: "فناوری در خدمت تازگی",
    title: "یخچال‌هایی فراتر از انتظار",
    subtitle: "ترکیب طراحی مینیمال، فناوری پیشرفته و تازگی ماندگار",
    description: "دنیایی از یخچال‌های مدرن و هوشمند برای زندگی امروز",
    primary: { label: "مشاهده محصولات", href: "/products" },
    secondary: { label: "راهنمای خرید", href: "#frostic-buying-guide" },
  },
  {
    id: "home-design",
    dayImage: "/images/arctic-showroom-light.webp",
    eyebrow: "هماهنگ با زیبایی خانه",
    title: "طراحی برای زندگی امروز",
    subtitle: "خطوط ساده، جزئیات دقیق و حضوری متفاوت در آشپزخانه",
    description:
      "یخچالی انتخاب کنید که با فضای خانه و سبک زندگی شما هماهنگ باشد",
    primary: { label: "مشاهده محصولات", href: "/products" },
    secondary: { label: "راهنمای خرید", href: "#frostic-buying-guide" },
  },
  {
    id: "thoughtful-choice",
    dayImage: "/images/arctic-showroom-light.webp",
    eyebrow: "انتخابی برای سال‌های پیش رو",
    title: "تازگی از یک انتخاب آغاز می‌شود",
    subtitle: "از ظرفیت و چیدمان تا مصرف انرژی؛ جزئیات را مقایسه کنید",
    description: "با شناخت نیازهای خانواده، یخچال مناسب خانه‌تان را پیدا کنید",
    primary: { label: "مشاهده محصولات", href: "/products" },
    secondary: { label: "راهنمای خرید", href: "#frostic-buying-guide" },
  },
];

function subscribeMotion(callback: () => void) {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function subscribeMobile(callback: () => void) {
  const media = matchMedia("(max-width: 767px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function FrosticHeroSlider({
  slides = defaultSlides,
  autoPlay = false,
  enableSwipe = false,
  showArrows = false,
  mobileControls = false,
}: {
  slides?: readonly FrosticHeroSlide[];
  autoPlay?: boolean;
  enableSwipe?: boolean;
  showArrows?: boolean;
  mobileControls?: boolean;
}) {
  const id = useId();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [interaction, setInteraction] = useState(0);
  const mobile = useSyncExternalStore(
    subscribeMobile,
    () => matchMedia("(max-width: 767px)").matches,
    () => false,
  );
  const mobileEnabled = mobileControls && mobile;
  const playing = autoPlay || mobileEnabled;
  const swiping = enableSwipe || mobileEnabled;
  const arrows = showArrows;
  const touch = useRef<{ x: number; y: number } | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
  const multiple = slides.length > 1;
  const active = index % (slides.length || 1);
  const stopped = paused || hovered || focused || hidden || reducedMotion;

  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    if (document.hidden) document.dispatchEvent(new Event("visibilitychange"));
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (!playing || !multiple || stopped) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % slides.length),
      6000,
    );
    return () => window.clearInterval(timer);
  }, [playing, multiple, slides.length, stopped, active, interaction]);

  function select(next: number) {
    setIndex(next);
    setInteraction((current) => current + 1);
  }

  function move(delta: number) {
    setIndex((current) => (current + delta + slides.length) % slides.length);
    setInteraction((current) => current + 1);
  }

  if (!slides.length) return null;

  return (
    <section
      className={styles.hero}
      aria-label="یخچال‌های فراستیک"
      aria-roledescription={multiple ? "اسلایدر" : undefined}
      tabIndex={multiple ? 0 : undefined}
      data-frostic-hero
      onKeyDown={(event) => {
        if (!multiple || event.target !== event.currentTarget) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? 1 : -1);
        }
      }}
      onMouseEnter={() => {
        if (matchMedia("(hover: hover)").matches) setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        setFocused(!mobileEnabled || event.target.matches(":focus-visible"));
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      onTouchStart={(event) => {
        touch.current = null;
        if (multiple && swiping && event.touches.length === 1)
          touch.current = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
          };
      }}
      onTouchCancel={() => {
        touch.current = null;
      }}
      onTouchEnd={(event) => {
        const start = touch.current;
        touch.current = null;
        if (!start || !multiple || !swiping) return;
        const dx = event.changedTouches[0].clientX - start.x;
        const dy = event.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy))
          move(dx > 0 ? 1 : -1);
      }}
    >
      <div className={styles.slides} aria-live={stopped ? "polite" : "off"}>
        {slides.map((slide, position) => (
          <article
            key={slide.id}
            id={`${id}-${slide.id}`}
            className={styles.slide}
            data-active={position === active}
            inert={position !== active}
            aria-hidden={position !== active}
            aria-label={
              multiple
                ? `${toPersianDigits(position + 1)} از ${toPersianDigits(slides.length)}`
                : undefined
            }
            aria-roledescription={multiple ? "اسلاید" : undefined}
          >
            <div className={styles.scene} aria-hidden="true">
              <Image
                src={slide.dayImage}
                alt=""
                fill
                priority={position === 0}
                sizes="(max-width: 767px) 100vw, 70vw"
              />
            </div>
            <div className={styles.content}>
              <div className={styles.copy}>
                <p className={styles.eyebrow}>
                  <span />
                  {slide.eyebrow}
                </p>
                {position === 0 ? (
                  <h1>{slide.title}</h1>
                ) : (
                  <h2>{slide.title}</h2>
                )}
                <p className={styles.subtitle}>{slide.subtitle}</p>
                <p className={styles.description}>{slide.description}</p>
                <div className={styles.actions}>
                  <Link className={styles.primary} href={slide.primary.href}>
                    {slide.primary.label}
                    <span aria-hidden="true">←</span>
                  </Link>
                  <Link
                    className={styles.secondary}
                    href={slide.secondary.href}
                  >
                    {slide.secondary.label}
                  </Link>
                </div>
              </div>
              <div
                className={styles.navigation}
                role="group"
                aria-label="کنترل اسلایدر"
              >
                <p className={styles.navigationLabel}>تازگی در هر فصل</p>
                <div className={styles.numbers}>
                  {slides.map((item, number) => {
                    const label = String(number + 1).padStart(2, "0");
                    return multiple ? (
                      <button
                        key={item.id}
                        type="button"
                        className={styles.number}
                        aria-label={`نمایش اسلاید ${toPersianDigits(number + 1)}`}
                        aria-controls={`${id}-${item.id}`}
                        aria-current={number === active ? "true" : undefined}
                        onClick={() => select(number)}
                      >
                        <span lang="en" dir="ltr">
                          {label}
                        </span>
                      </button>
                    ) : (
                      <span
                        key={item.id}
                        className={styles.number}
                        aria-current="true"
                        aria-label="اسلاید اول"
                      >
                        <span lang="en" dir="ltr">
                          {label}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      {multiple && !mobileEnabled && (arrows || playing) && (
        <div
          className={styles.playback}
          role="group"
          aria-label="کنترل اسلایدر"
        >
          {arrows && (
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="اسلاید قبلی"
            >
              →
            </button>
          )}
          {arrows && (
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="اسلاید بعدی"
            >
              ←
            </button>
          )}
          {playing && !reducedMotion && (
            <button
              type="button"
              aria-pressed={paused}
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? "پخش" : "توقف"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
