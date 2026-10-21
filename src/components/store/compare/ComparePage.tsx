"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type UIEvent,
} from "react";
import {
  ChevronLeft,
  GitCompareArrows,
  Plus,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatPrice, toPersianDigits } from "@/lib/format";
import type { CompareProductDTO } from "@/types/dto";
import { CompareProductHeader } from "./CompareProductHeader";
import { CompareProductPicker } from "./CompareProductPicker";
import {
  CompareHighlights,
  CompareSpecificationsTable,
} from "./CompareSpecificationsTable";
import { getCompareAttribute } from "./compare-data";
import styles from "./compare.module.css";
import {
  comparisonHref,
  readComparisonSelection,
  writeComparisonSelection,
} from "./comparison-selection";
import { COMPARE_PRODUCT_LIMIT, parseCompareIds } from "@/validations/compare";

export function ComparePage({
  initialProducts,
  requestedCount,
  fixtures,
  persistSelection = false,
}: {
  initialProducts: CompareProductDTO[];
  requestedCount: number;
  fixtures?: CompareProductDTO[];
  persistSelection?: boolean;
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [picker, setPicker] = useState(false);
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [message, setMessage] = useState("");
  const [headerHeight, setHeaderHeight] = useState(100);
  const viewports = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!persistSelection) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("products")) {
      const saved = parseCompareIds(readComparisonSelection());
      if (saved.length) {
        router.replace(comparisonHref(saved), { scroll: false });
        return;
      }
    }
    writeComparisonSelection(initialProducts.map((product) => product.id));
  }, [initialProducts, persistSelection, router]);

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const observer = new ResizeObserver(() =>
      setHeaderHeight(
        header.getBoundingClientRect().height +
          (parseFloat(getComputedStyle(header).top) || 0) +
          8,
      ),
    );
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  function synchronize(event: UIEvent<HTMLDivElement>) {
    const source = event.currentTarget;
    for (const viewport of viewports.current) {
      if (
        viewport &&
        viewport !== source &&
        Math.abs(viewport.scrollLeft - source.scrollLeft) > 1
      )
        viewport.scrollLeft = source.scrollLeft;
    }
  }

  function update(next: CompareProductDTO[]) {
    setProducts(next);
    if (persistSelection)
      writeComparisonSelection(next.map((product) => product.id));
    const url = new URL(window.location.href);
    url.searchParams.set(
      "products",
      next.map((product) => product.id).join(","),
    );
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }
  function add(product: CompareProductDTO) {
    if (products.some((item) => item.id === product.id)) return;
    if (products.length >= COMPARE_PRODUCT_LIMIT) {
      setMessage(
        "حداکثر چهار محصول را می‌توان مقایسه کرد؛ ابتدا یک محصول را حذف کن.",
      );
      return;
    }
    update([...products, product]);
    setMessage("محصول به مقایسه اضافه شد.");
  }
  function remove(id: string) {
    update(products.filter((product) => product.id !== id));
    setMessage("محصول از مقایسه حذف شد.");
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage("لینک مقایسه کپی شد.");
    } catch {
      setMessage("برای اشتراک‌گذاری، نشانی این صفحه را از نوار آدرس کپی کن.");
    }
  }
  const slots = Math.min(COMPARE_PRODUCT_LIMIT, products.length + 1);
  const variables = {
    "--slots": slots,
    "--site-header-height": `${headerHeight}px`,
  } as CSSProperties;

  return (
    <main className={styles.page} style={variables}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="مسیر صفحه">
          <Link href="/">خانه</Link>
          <ChevronLeft size={14} />
          <span aria-current="page">مقایسه محصولات</span>
        </nav>
        <div className={styles.titleRow}>
          <div>
            <p className={styles.eyebrow}>
              <GitCompareArrows size={18} /> انتخاب آگاهانه، خرید مطمئن
            </p>
            <h1>مقایسه محصولات</h1>
            <p>
              محصولات موردنظرت رو کنار هم بررسی کن و انتخاب بهتری داشته باش.
            </p>
          </div>
          <div className={styles.actions}>
            <Button
              variant="secondary"
              onClick={share}
              disabled={products.length === 0}
            >
              <Share2 size={17} /> اشتراک‌گذاری
            </Button>
            <Button
              variant="secondary"
              disabled={products.length === 0}
              onClick={() => {
                update([]);
                setMessage("مقایسه پاک شد.");
              }}
            >
              <Trash2 size={17} /> پاک کردن مقایسه
            </Button>
          </div>
        </div>
        {fixtures && (
          <div className={styles.notice} role="status">
            دیتابیس در دسترس نیست. این صفحه فقط داده‌های نمونهٔ آزمایشی را نمایش
            می‌دهد و قیمت‌ها برای خرید معتبر نیستند.{" "}
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              تلاش مجدد برای اتصال
            </Button>
          </div>
        )}
        {requestedCount > initialProducts.length && (
          <p className={styles.notice}>
            بعضی از محصولات لینک، حذف یا غیرفعال شده‌اند و قابل نمایش نیستند.
          </p>
        )}
        <p className={styles.liveMessage} role="status" aria-live="polite">
          {message}
        </p>
        {products.length === 0 ? (
          <section className={styles.empty}>
            <span className={styles.emptyIcon}>
              <GitCompareArrows size={38} />
            </span>
            <h2>هنوز محصولی برای مقایسه انتخاب نکردی</h2>
            <p>محصولات موردنظرت رو اضافه کن تا مشخصاتشون رو کنار هم ببینی.</p>
            <div className={styles.actions}>
              <Button onClick={() => setPicker(true)}>
                <Plus size={18} /> افزودن اولین محصول
              </Button>
              <Link className={styles.productLink} href="/products">
                مشاهده محصولات
              </Link>
            </div>
            <small>
              تا {toPersianDigits(COMPARE_PRODUCT_LIMIT)} محصول را کنار هم
              مقایسه کن.
            </small>
          </section>
        ) : (
          <>
            {products.length === 1 && (
              <p className={styles.notice}>
                برای دیدن تفاوت‌ها، محصول دوم را به مقایسه اضافه کن.
              </p>
            )}
            {products.length >= COMPARE_PRODUCT_LIMIT && (
              <p className={styles.hint}>
                ظرفیت مقایسه تکمیل است؛ برای افزودن محصول جدید یکی از انتخاب‌ها
                را حذف کن.
              </p>
            )}
            <p className={styles.mobileHint}>
              برای دیدن ستون‌های بیشتر، جدول را به صورت افقی حرکت بده.
            </p>
            <div
              className={styles.viewport}
              ref={(element) => {
                viewports.current[0] = element;
              }}
              onScroll={synchronize}
              tabIndex={0}
              aria-label="محصولات انتخاب‌شده، قابل پیمایش افقی"
            >
              <CompareProductHeader
                products={products}
                onRemove={remove}
                onPick={() => setPicker(true)}
                fixture={Boolean(fixtures)}
              />
            </div>
            <div className={styles.tableHeading}>
              <div>
                <p className={styles.eyebrow}>جزئیات، کنار هم</p>
                <h2>مقایسه مشخصات فنی</h2>
              </div>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={onlyDifferences}
                  disabled={products.length < 2}
                  onChange={(event) => setOnlyDifferences(event.target.checked)}
                />
                <span>فقط تفاوت‌ها را نمایش بده</span>
              </label>
            </div>
            <div className={styles.tableArea}>
              <div
                className={`${styles.viewport} ${styles.sticky}`}
                ref={(element) => {
                  viewports.current[1] = element;
                }}
                onScroll={synchronize}
                tabIndex={0}
                aria-label="خلاصهٔ محصولات، قابل پیمایش افقی"
              >
                <div className={`${styles.canvas} ${styles.stickyGrid}`}>
                  <div className={styles.featureLabel}>مشخصات محصول</div>
                  {products.map((product) => (
                    <div className={styles.stickyProduct} key={product.id}>
                      <Image
                        src={product.images[0]}
                        alt=""
                        width={32}
                        height={48}
                        className={styles.thumbnail}
                      />
                      <div>
                        <strong>
                          {toPersianDigits(
                            getCompareAttribute(product, "مدل") ??
                              product.title,
                          )}
                        </strong>
                        <small>{formatPrice(product.price)}</small>
                      </div>
                      <button
                        className={styles.iconButton}
                        onClick={() => remove(product.id)}
                        aria-label={`حذف ${product.title}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {products.length < COMPARE_PRODUCT_LIMIT && (
                    <button
                      className={styles.miniAdd}
                      onClick={() => setPicker(true)}
                    >
                      <Plus size={18} /> افزودن محصول
                    </button>
                  )}
                </div>
              </div>
              <div
                className={styles.viewport}
                ref={(element) => {
                  viewports.current[2] = element;
                }}
                onScroll={synchronize}
                tabIndex={0}
                aria-label="جدول مقایسه، قابل پیمایش افقی"
              >
                <div className={styles.canvas}>
                  <CompareHighlights products={products} />
                  <CompareSpecificationsTable
                    products={products}
                    onlyDifferences={onlyDifferences && products.length > 1}
                  />
                </div>
              </div>
            </div>
            <p className={styles.footnote}>
              «ثبت نشده» یعنی اطلاعات این ویژگی در کاتالوگ موجود نیست؛ به معنی
              نداشتن آن قابلیت نیست.
            </p>
          </>
        )}
      </div>
      {picker && (
        <CompareProductPicker
          selected={products.map((product) => product.id)}
          onAdd={add}
          onClose={() => setPicker(false)}
          fixtures={fixtures}
        />
      )}
    </main>
  );
}
