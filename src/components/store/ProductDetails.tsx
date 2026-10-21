"use client";
import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useActionState,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  addCartAction,
  updateCartAction,
  removeCartAction,
} from "@/actions/cart.actions";
import { cartItemSchema } from "@/validations/cart";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Leaf,
  Maximize2,
  Minus,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Snowflake,
  Truck,
  X,
} from "lucide-react";
import { ProductLikeButton } from "@/components/store/ProductLikeButton";
import { CompareProductButton } from "@/components/store/compare/CompareProductButton";
import { Button } from "@/components/ui/Button";
import { formatPrice, toPersianDigits } from "@/lib/format";
import type { StoreProductDTO } from "@/types/dto";
import styles from "./product-details.module.css";
import { RelatedProductsCarousel } from "./RelatedProductsCarousel";
import { getRealPreviewData } from "./product-details-data";
const sections = [
  ["description", "معرفی"],
  ["specifications", "مشخصات فنی"],
  ["related", "کالاهای مشابه"],
] as const;
const benefits = [
  { Icon: ShieldCheck, label: "ضمانت اصالت" },
  { Icon: Truck, label: "ارسال مطمئن" },
  { Icon: Snowflake, label: "تخصص در سرمایش" },
  { Icon: Leaf, label: "انتخاب آگاهانه" },
];
type ProductDetailsProps = {
  mode: "storefront";
  realProduct: StoreProductDTO;
  realRelatedProducts: StoreProductDTO[];
  initialQuantity: number;
};
function SpecificationGroup({
  group,
}: {
  group: ReturnType<typeof getRealPreviewData>["specifications"][number];
}) {
  return (
    <div className={styles.specGroup}>
      <h3>{group.title}</h3>
      <table>
        <caption className="sr-only">{group.title}</caption>
        <tbody>
          {group.rows.map(([key, value]) => (
            <tr key={key}>
              <th scope="row">{key}</th>
              <td>
                <bdi>{toPersianDigits(value)}</bdi>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function ProductDetails({
  realProduct,
  realRelatedProducts,
  mode,
  initialQuantity = 0,
}: ProductDetailsProps) {
  const router = useRouter();
  const product = realProduct;
  const realData = getRealPreviewData(realProduct);
  const relatedProducts = realRelatedProducts;
  const galleryViews = realData.galleryViews;
  const specifications = realData.specifications;
  const discountPercent = realData.discountPercent;
  const descriptionNeedsExpansion = product.description.length > 280;
  const [notice, setNotice] = useState("");
  const [imageIndex, setImageIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [specificationsExpanded, setSpecificationsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState("description");
  const [sharedUrl, setSharedUrl] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const quantity = initialQuantity;
  const [cartState, cartAction, cartPending] = useActionState(
    async (
      _previous: Awaited<ReturnType<typeof addCartAction>> | undefined,
      form: FormData,
    ) => {
      const parsed = cartItemSchema.safeParse(Object.fromEntries(form));
      const intent = z
        .enum(["add", "increment", "decrement", "remove"])
        .safeParse(form.get("intent"));
      if (!parsed.success || !intent.success)
        return { ok: false as const, error: "اطلاعات سبد معتبر نیست" };
      const payload = new FormData();
      payload.set("product", parsed.data.product);
      payload.set(
        "quantity",
        String(
          intent.data === "increment"
            ? parsed.data.quantity + 1
            : intent.data === "decrement"
              ? parsed.data.quantity - 1
              : 1,
        ),
      );
      const action =
        intent.data === "add"
          ? addCartAction
          : intent.data === "remove"
            ? removeCartAction
            : updateCartAction;
      const result = await action(undefined, payload);
      if (result.ok) {
        setNotice("سبد خرید به‌روز شد");
        router.refresh();
      }
      return result;
    },
    undefined,
  );
  const view = galleryViews[imageIndex] ?? galleryViews[0];
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 7000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-130px 0px -55% 0px", threshold: 0 },
    );
    sections.forEach(([id]) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);
  function openGallery(event: MouseEvent<HTMLButtonElement>) {
    opener.current = event.currentTarget;
    setZoomed(false);
    dialog.current?.showModal();
  }
  function moveImage(delta: number) {
    setImageIndex(
      (current) =>
        (current + delta + galleryViews.length) % galleryViews.length,
    );
    setZoomed(false);
  }
  async function share() {
    const url = new URL(`/products/${product.slug}`, window.location.origin)
      .href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.title, url });
        return;
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice("پیوند محصول کپی شد.");
    } catch {
      setSharedUrl(url);
      setNotice("برای اشتراک‌گذاری، پیوند نمایش‌داده‌شده را کپی کنید.");
    }
  }
  function purchaseControl() {
    return (
      <form action={cartAction} className={styles.purchaseControl}>
        <input type="hidden" name="product" value={product.id} />
        <input type="hidden" name="quantity" value={Math.max(1, quantity)} />
        {quantity > 0 ? (
          <div
            className={styles.quantity}
            role="group"
            aria-label="تعداد در سبد خرید"
            aria-busy={cartPending}
          >
            <button
              type="submit"
              name="intent"
              value="increment"
              aria-label="افزایش تعداد"
              disabled={cartPending || quantity >= Math.min(product.stock, 10)}
            >
              <Plus size={18} aria-hidden="true" />
            </button>
            <span>
              <output aria-live="polite">{toPersianDigits(quantity)}</output>
              <small>{cartPending ? "در حال ثبت…" : "در سبد خرید"}</small>
            </span>
            <button
              type="submit"
              name="intent"
              value={quantity === 1 ? "remove" : "decrement"}
              aria-label={quantity === 1 ? "حذف از سبد خرید" : "کاهش تعداد"}
              disabled={cartPending}
            >
              <Minus size={18} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <Button
            type="submit"
            name="intent"
            value="add"
            className={styles.addButton}
            disabled={cartPending || product.stock === 0}
          >
            <ShoppingCart size={19} aria-hidden="true" />
            {cartPending
              ? "در حال افزودن…"
              : product.stock === 0
                ? "ناموجود"
                : "افزودن به سبد خرید"}
          </Button>
        )}
        {quantity > 0 && (
          <Link className={styles.cartLink} href="/cart">
            مشاهده سبد خرید <ChevronLeft size={14} aria-hidden="true" />
          </Link>
        )}
      </form>
    );
  }
  function renderImage(modal = false) {
    return (
      <Image
        src={view.src}
        alt={`${product.title}؛ ${toPersianDigits(view.label)}`}
        fill
        priority={!modal}
        sizes={
          modal
            ? "85vw"
            : "(min-width: 1024px) 34vw, (min-width: 768px) 50vw, 90vw"
        }
        className={styles.productImage}
        style={{
          transform: `scale(${view.scale * (modal && zoomed ? 1.4 : 1)})`,
          transformOrigin: view.position,
        }}
      />
    );
  }
  return (
    <div
      className={styles.page}
      data-product-details={mode}
      data-product-id={product.id}
      data-product-source="database"
    >
      <main className={styles.content}>
        <nav className={styles.breadcrumb} aria-label="مسیر صفحه">
          <Link href="/">لانچ‌اوکس</Link>
          <ChevronLeft size={14} />
          <Link href="/products">یخچال و فریزر</Link>
          <ChevronLeft size={14} />
          <span>{product.category.name}</span>
        </nav>

        <section className={styles.hero} aria-labelledby="product-title">
          <div className={styles.galleryPanel}>
            <div className={styles.galleryTools}>
              <ProductLikeButton id={product.id} title={product.title} />
              {
                <CompareProductButton
                  id={product.id}
                  title={product.title}
                  iconOnly
                />
              }
              <button onClick={share} aria-label="اشتراک‌گذاری محصول">
                <Share2 size={21} />
              </button>
              <button onClick={openGallery} aria-label="باز کردن گالری بزرگ">
                <Maximize2 size={21} />
              </button>
            </div>
            <button
              className={styles.mainImage}
              onClick={openGallery}
              aria-label={`بزرگ‌نمایی ${view.label}`}
            >
              {renderImage()}
            </button>
            <div
              className={styles.thumbnails}
              role="group"
              aria-label="نماهای محصول"
            >
              {galleryViews.map((item, index) => (
                <button
                  key={item.label}
                  aria-label={toPersianDigits(item.label)}
                  aria-pressed={index === imageIndex}
                  onClick={() => setImageIndex(index)}
                >
                  <span className={styles.thumbnailImage}>
                    <Image
                      src={item.src}
                      alt=""
                      fill
                      sizes="64px"
                      className={styles.productImage}
                      style={{
                        transform: `scale(${item.scale})`,
                        transformOrigin: item.position,
                      }}
                    />
                  </span>
                </button>
              ))}
            </div>
            <p className={styles.caption}>{toPersianDigits(view.label)}</p>
          </div>
          <div className={styles.summary}>
            <p className={styles.brand}>
              {realData.brand ?? "برند نامشخص"}{" "}
              <span>/ {product.category.name}</span>
            </p>
            <h1 id="product-title">{toPersianDigits(product.title)}</h1>
            <p className={styles.model}>
              {realData?.model
                ? `مدل ${toPersianDigits(realData.model)}`
                : product.sku
                  ? `شناسه کالا: ${toPersianDigits(product.sku)}`
                  : product.category.name}
            </p>

            {
              <p className={styles.caption}>
                رنگ محصول:{" "}
                {toPersianDigits(
                  realData?.color ?? "اطلاعات رنگ در دسترس نیست",
                )}
              </p>
            }
            <h2 className={styles.smallTitle}>ویژگی‌های اصلی</h2>
            <dl className={styles.features}>
              {product.attributes
                .filter((item) => !["مدل", "رنگ", "برند"].includes(item.key))
                .map((item) => (
                  <div key={item.key}>
                    <dt>{item.key}</dt>
                    <dd>{toPersianDigits(item.value)}</dd>
                  </div>
                ))}
            </dl>
            <a className={styles.specLink} href="#specifications">
              مشاهده همه مشخصات <ChevronLeft size={16} />
            </a>
            <p className={styles.disclaimer}>
              قبل از انتخاب، ابعاد محل نصب و مسیر حمل را بررسی کنید.
            </p>
          </div>
          <aside className={styles.purchase} aria-label="خرید محصول">
            <div className={styles.seller}>
              <span className={styles.sellerIcon}>
                <Snowflake size={24} />
              </span>
              <div>
                <h2>فروشگاه لانچ‌اوکس</h2>
                <small>فروشنده مستقیم</small>
              </div>
              <ShieldCheck size={20} />
            </div>
            <div className={styles.serviceRow}>
              <ShieldCheck size={21} />
              <span>
                {toPersianDigits(
                  realData?.warranty ?? "اطلاعات گارانتی در دسترس نیست",
                )}
              </span>
            </div>
            <div className={styles.serviceRow}>
              <Truck size={21} />
              <span>
                {toPersianDigits(
                  realData?.shipping ?? "زمان ارسال مشخص نشده است",
                )}
              </span>
            </div>
            <div className={styles.serviceRow}>
              <Check size={21} />
              <span
                className={product.stock > 0 ? styles.available : undefined}
              >
                {product.stock > 0 ? "موجود در انبار" : "ناموجود"}

                <small>{toPersianDigits(product.stock)} عدد</small>
              </span>
            </div>
            <div className={styles.price}>
              {product.compareAtPrice &&
                product.compareAtPrice > product.price && (
                  <div>
                    <span className={styles.discount}>
                      {toPersianDigits(discountPercent)}٪
                    </span>
                    <del>{formatPrice(product.compareAtPrice)}</del>
                  </div>
                )}
              <strong>{formatPrice(product.price)}</strong>
            </div>
            {purchaseControl()}
          </aside>
        </section>
        <div className={styles.benefits}>
          {benefits.map(({ Icon, label }) => (
            <div key={label}>
              <Icon size={25} />
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div
          className={styles.notice}
          role={cartState && !cartState.ok ? "alert" : "status"}
          aria-live="polite"
        >
          {cartState && !cartState.ok ? cartState.error : notice}
        </div>
        {sharedUrl && (
          <label className={styles.shareFallback}>
            پیوند پیش‌نمایش
            <input
              readOnly
              dir="ltr"
              value={sharedUrl}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
        )}
        <nav className={styles.sectionLinks} aria-label="بخش‌های اطلاعات محصول">
          {sections.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={activeSection === id ? "location" : undefined}
              onClick={(event) => {
                event.preventDefault();
                setActiveSection(id);
                document.getElementById(id)?.scrollIntoView({
                  behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "instant"
                    : "smooth",
                });
              }}
            >
              {label}
            </a>
          ))}
        </nav>
        <section id="description" className={styles.infoSection}>
          <h2>معرفی محصول</h2>
          <p className={styles.sectionSubtitle}>{"درباره این محصول"}</p>
          <div id="product-description">
            <p>
              {toPersianDigits(
                descriptionNeedsExpansion && !expanded
                  ? `${product.description.slice(0, 280)}…`
                  : product.description,
              )}
            </p>
          </div>
          {descriptionNeedsExpansion && (
            <button
              className={styles.textButton}
              aria-expanded={expanded}
              aria-controls="product-description"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "نمایش کمتر" : "نمایش بیشتر"}
              <ChevronLeft size={16} />
            </button>
          )}
        </section>
        <section id="specifications" className={styles.infoSection}>
          <h2>مشخصات فنی</h2>
          <p className={styles.sectionSubtitle}>{"اطلاعات فنی محصول"}</p>
          <div className={styles.specGroups}>
            {specifications.slice(0, 1).map((group) => (
              <SpecificationGroup key={group.title} group={group} />
            ))}
          </div>
          <div
            id="additional-specifications"
            className={styles.additionalSpecs}
            data-expanded={specificationsExpanded}
            aria-hidden={!specificationsExpanded}
            inert={!specificationsExpanded}
          >
            <div className={styles.additionalSpecsInner}>
              <div className={styles.specGroups}>
                {specifications.slice(1).map((group) => (
                  <SpecificationGroup key={group.title} group={group} />
                ))}
              </div>
            </div>
          </div>
          {specifications.length > 1 && (
            <button
              className={styles.textButton}
              aria-expanded={specificationsExpanded}
              aria-controls="additional-specifications"
              onClick={() => setSpecificationsExpanded((current) => !current)}
            >
              {specificationsExpanded ? "مشاهده کمتر" : "مشاهده بیشتر"}
              {specificationsExpanded ? (
                <ChevronUp size={16} aria-hidden="true" />
              ) : (
                <ChevronDown size={16} aria-hidden="true" />
              )}
            </button>
          )}
        </section>

        <RelatedProductsCarousel products={relatedProducts} />
      </main>

      <div className={styles.mobileBuy} aria-label="خرید سریع">
        <div>
          <small>قیمت محصول</small>
          <strong>{formatPrice(product.price)}</strong>
        </div>
        {purchaseControl()}
      </div>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="image-dialog-title"
        onClose={() => opener.current?.focus()}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            moveImage(event.key === "ArrowLeft" ? 1 : -1);
          }
        }}
      >
        <div className={styles.dialogHeading}>
          <h2 id="image-dialog-title">
            {`گالری محصول · ${toPersianDigits(view.label)}`}
          </h2>
          <button
            autoFocus
            onClick={() => dialog.current?.close()}
            aria-label="بستن گالری"
          >
            <X size={22} />
          </button>
        </div>
        <button
          className={styles.enlargedImage}
          aria-label={zoomed ? "کاهش بزرگ‌نمایی" : "بزرگ‌نمایی بیشتر"}
          aria-pressed={zoomed}
          onClick={() => setZoomed(!zoomed)}
        >
          {renderImage(true)}
        </button>
        {
          <div className={styles.galleryNavigation}>
            <button
              onClick={() => moveImage(-1)}
              aria-label="تصویر قبلی"
              disabled={galleryViews.length < 2}
            >
              <ChevronRight />
            </button>
            <span aria-live="polite">
              {toPersianDigits(imageIndex + 1)} از{" "}
              {toPersianDigits(galleryViews.length)} ·{" "}
              {toPersianDigits(view.label)}
            </span>
            <button
              onClick={() => moveImage(1)}
              aria-label="تصویر بعدی"
              disabled={galleryViews.length < 2}
            >
              <ChevronLeft />
            </button>
          </div>
        }
        <p className={styles.caption}>برای بزرگ‌نمایی روی تصویر بزنید.</p>
      </dialog>
    </div>
  );
}
