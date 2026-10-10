"use client";

import { useRef } from "react";
import { Leaf, ShieldCheck, Smartphone, Truck, VolumeX } from "lucide-react";
import styles from "./ArcticBenefitsBar.module.css";

const benefits = [
  { title: "مصرف بهینه", description: "انتخاب کم‌مصرف", icon: Leaf },
  { title: "کنترل هوشمند", description: "مدیریت دقیق دما", icon: Smartphone },
  { title: "عملکرد کم‌صدا", description: "آرامش در خانه", icon: VolumeX },
  { title: "ارسال تخصصی", description: "حمل ایمن تا مقصد", icon: Truck },
  { title: "ضمانت اصالت", description: "خرید مطمئن", icon: ShieldCheck },
] as const;

export function ArcticBenefitsBar() {
  const drag = useRef<{
    pointerId: number;
    x: number;
    scrollLeft: number;
  } | null>(null);

  return (
    <section
      className={`${styles.placement} mx-auto w-full max-w-[1560px] px-5 sm:px-8`}
      dir="rtl"
      aria-label="مزایای خرید و امکانات یخچال"
      data-arctic-benefits
    >
      <div
        className={styles.bar}
        role="region"
        aria-label="مزایا؛ برای مشاهده همه موارد، افقی پیمایش کنید"
        tabIndex={0}
        onPointerDown={(event) => {
          const bar = event.currentTarget;
          if (
            event.pointerType !== "mouse" ||
            event.button !== 0 ||
            bar.scrollWidth <= bar.clientWidth
          )
            return;
          drag.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            scrollLeft: bar.scrollLeft,
          };
          bar.dataset.dragging = "true";
          bar.setPointerCapture(event.pointerId);
          bar.focus({ preventScroll: true });
          event.preventDefault();
        }}
        onPointerMove={(event) => {
          if (drag.current?.pointerId !== event.pointerId) return;
          event.currentTarget.scrollLeft =
            drag.current.scrollLeft + drag.current.x - event.clientX;
        }}
        onPointerUp={(event) => {
          if (drag.current?.pointerId !== event.pointerId) return;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onLostPointerCapture={(event) => {
          drag.current = null;
          delete event.currentTarget.dataset.dragging;
        }}
      >
        <ul className="flex w-full items-center">
          {benefits.map(({ title, description, icon: Icon }) => (
            <li
              key={title}
              className={`${styles.item} flex h-[78px] shrink-0 basis-1/2 snap-start items-center justify-center gap-2 px-2 sm:basis-1/3 sm:gap-2.5 sm:px-3 lg:h-[83px] lg:min-w-0 lg:flex-1 lg:basis-0 lg:gap-3.5`}
            >
              <Icon
                size={30}
                strokeWidth={1.6}
                className="size-[22px] shrink-0 text-[#1683FF] sm:size-6 lg:size-[30px]"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-1 text-start whitespace-nowrap lg:gap-[5px]">
                <h2
                  className={`${styles.title} text-xs leading-[18px] font-bold sm:text-[13px] lg:text-sm lg:leading-5`}
                >
                  {title}
                </h2>
                <p
                  className={`${styles.description} text-[10px] leading-4 lg:text-[11px]`}
                >
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
