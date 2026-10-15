"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEventHandler,
  type MouseEventHandler,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import type { StoreProductDTO } from "@/types/dto";
import styles from "./product-details.module.css";

export function RelatedProductsCarousel({
  products,
  onClickCapture,
  onSubmitCapture,
}: {
  products: StoreProductDTO[];
  onClickCapture?: MouseEventHandler<HTMLDivElement>;
  onSubmitCapture?: FormEventHandler<HTMLDivElement>;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    function updateEdges() {
      if (!element) return;
      const offset = Math.abs(element.scrollLeft);
      const maximum = Math.max(0, element.scrollWidth - element.clientWidth);
      setEdges({ start: offset <= 2, end: offset >= maximum - 2 });
    }
    const observer = new ResizeObserver(updateEdges);
    observer.observe(element);
    element.addEventListener("scroll", updateEdges, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", updateEdges);
    };
  }, [products]);

  function move(direction: "next" | "previous") {
    const element = track.current;
    const slide = element?.firstElementChild;
    if (!element || !slide) return;
    const step =
      slide.getBoundingClientRect().width +
      Number.parseFloat(getComputedStyle(element).columnGap);
    element.scrollBy({
      left: direction === "next" ? -step : step,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }

  return (
    <section
      id="related"
      className={`${styles.infoSection} ${styles.relatedPanel}`}
      aria-labelledby="related-products-title"
    >
      <div className={styles.relatedHeader}>
        <h2 id="related-products-title">کالاهای مشابه</h2>
      </div>
      {products.length > 0 ? (
        <div className={styles.relatedCarousel}>
          <button
            type="button"
            className={`${styles.carouselArrow} ${styles.carouselPrevious}`}
            aria-label="کالاهای قبلی"
            aria-controls="related-products-track"
            disabled={edges.start}
            onClick={() => move("previous")}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
          <div
            id="related-products-track"
            ref={track}
            className={styles.relatedTrack}
            role="group"
            aria-label="پیمایش کالاهای مشابه"
            tabIndex={0}
            onClickCapture={onClickCapture}
            onSubmitCapture={onSubmitCapture}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                move(event.key === "ArrowLeft" ? "next" : "previous");
              }
            }}
          >
            {products.map((item) => (
              <div className={styles.relatedSlide} key={item.id}>
                <ProductCard product={item} variant="compact" />
              </div>
            ))}
          </div>
          <button
            type="button"
            className={`${styles.carouselArrow} ${styles.carouselNext}`}
            aria-label="کالاهای بعدی"
            aria-controls="related-products-track"
            disabled={edges.end}
            onClick={() => move("next")}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <p>کالای مشابهی برای نمایش وجود ندارد.</p>
      )}
    </section>
  );
}
