"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useActionState,
  useRef,
  useState,
  type MouseEvent,
  type FormEvent,
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
  MessageCircle,
  Minus,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Snowflake,
  Star,
  Truck,
  X,
} from "lucide-react";
import { FrosticHeader } from "@/components/preview/frostic/FrosticHeader";
import { ProductLikeButton } from "@/components/store/ProductLikeButton";
import { CompareProductButton } from "@/components/store/compare/CompareProductButton";
import { StoreFooter } from "@/components/store/StoreFooter";
import { Button } from "@/components/ui/Button";
import { formatDate, formatPrice, toPersianDigits } from "@/lib/format";
import type { StoreProductDTO } from "@/types/dto";
import {
  mockProduct,
  previewDetails,
  relatedProducts as mockRelatedProducts,
  galleryViews as mockGalleryViews,
  specifications as mockSpecifications,
  mockReviews,
  mockQuestions,
} from "@/components/preview/product/mock-product";
import styles from "./product-details.module.css";
import { RelatedProductsCarousel } from "./RelatedProductsCarousel";
import { getRealPreviewData } from "./product-details-data";

const sections = [
  ["description", "معرفی"],
  ["specifications", "مشخصات فنی"],
  ["customer-reviews", "دیدگاه‌ها"],
  ["questions", "پرسش و پاسخ"],
  ["related", "کالاهای مشابه"],
] as const;
const benefits = [
  { Icon: ShieldCheck, label: "ضمانت اصالت" },
  { Icon: Truck, label: "ارسال مطمئن" },
  { Icon: Snowflake, label: "تخصص در سرمایش" },
  { Icon: Leaf, label: "انتخاب آگاهانه" },
];
const sortSchema = z.enum(["helpful", "newest", "highest"]);

type ProductDetailsProps = {
  feedbackState?: "empty" | "sample";
} & (
  | {
      mode: "storefront";
      realProduct: StoreProductDTO;
      realRelatedProducts: StoreProductDTO[];
      initialQuantity: number;
    }
  | {
      mode?: "preview";
      realProduct?: StoreProductDTO;
      realRelatedProducts?: StoreProductDTO[];
      initialQuantity?: never;
    }
);

function SpecificationGroup({
  group,
}: {
  group: (typeof mockSpecifications)[number];
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
  feedbackState = "sample",
  realProduct,
  realRelatedProducts,
  mode = "preview",
  initialQuantity = 0,
}: ProductDetailsProps) {
  const isStorefront = mode === "storefront";
  const router = useRouter();
  const product = realProduct ?? mockProduct;
  const realData = realProduct ? getRealPreviewData(realProduct) : undefined;
  const relatedProducts = realProduct
    ? (realRelatedProducts ?? [])
    : mockRelatedProducts;
  const galleryViews =
    realData?.galleryViews ??
    mockGalleryViews.map((view) => ({ ...view, src: product.images[0] }));
  const specifications = realData?.specifications ?? mockSpecifications;
  const discountPercent =
    realData?.discountPercent ?? previewDetails.discountPercent;
  const descriptionNeedsExpansion = realProduct
    ? product.description.length > 280
    : true;
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState("");
  const [selectedColor, setSelectedColor] = useState("silver");
  const [imageIndex, setImageIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [specificationsExpanded, setSpecificationsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState("description");
  const [sort, setSort] = useState<z.infer<typeof sortSchema>>("helpful");
  const [sharedUrl, setSharedUrl] = useState("");
  const [relatedImage, setRelatedImage] = useState<{
    src: string;
    title: string;
  } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const color = previewDetails.colors.find(
    (item) => item.id === selectedColor,
  )!;
  const cartKey = realProduct ? product.id : `${product.id}:${selectedColor}`;
  const quantity = isStorefront ? initialQuantity : (cart[cartKey] ?? 0);
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
  const productCount = realProduct
    ? quantity
    : previewDetails.colors.reduce(
        (count, item) => count + (cart[`${product.id}:${item.id}`] ?? 0),
        0,
      );
  const cartCount = Object.values(cart).reduce(
    (total, count) => total + count,
    0,
  );
  const view = galleryViews[imageIndex] ?? galleryViews[0];
  const reviews = realProduct || feedbackState === "empty" ? [] : mockReviews;
  const questions =
    realProduct || feedbackState === "empty" ? [] : mockQuestions;
  const sortedReviews = [...reviews].sort((a, b) =>
    sort === "newest"
      ? b.date.localeCompare(a.date)
      : sort === "highest"
        ? b.rating - a.rating
        : b.helpful - a.helpful,
  );

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

  function changeQuantity(delta: number) {
    if (delta > 0 && productCount >= product.stock) {
      setNotice(
        realProduct
          ? "موجودی ثبت‌شده برای افزودن تعداد بیشتر کافی نیست."
          : "موجودی نمونه برای افزودن تعداد بیشتر کافی نیست.",
      );
      return;
    }
    setCart((current) => ({
      ...current,
      [cartKey]: Math.max(0, (current[cartKey] ?? 0) + delta),
    }));
    setNotice(
      delta > 0
        ? "سبد آزمایشی همین صفحه به‌روز شد؛ سفارشی در سرور ثبت نشده است."
        : "تعداد در سبد آزمایشی کاهش یافت.",
    );
  }
  function openGallery(event: MouseEvent<HTMLButtonElement>) {
    opener.current = event.currentTarget;
    setRelatedImage(null);
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
    const url = new URL(
      isStorefront ? `/products/${product.slug}` : "/test/product",
      window.location.origin,
    ).href;
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
      setNotice("پیوند پیش‌نمایش کپی شد.");
    } catch {
      setSharedUrl(url);
      setNotice("برای اشتراک‌گذاری، پیوند نمایش‌داده‌شده را کپی کنید.");
    }
  }
  function previewRelated(event: MouseEvent<HTMLDivElement>) {
    if (!(event.target instanceof Element)) return;
    const anchor = event.target.closest<HTMLAnchorElement>("a");
    const item = relatedProducts.find(
      (related) => anchor?.getAttribute("href") === `/products/${related.slug}`,
    );
    if (!item || !anchor) return;
    event.preventDefault();
    event.stopPropagation();
    opener.current = anchor;
    setRelatedImage({ src: item.images[0], title: item.title });
    setZoomed(false);
    dialog.current?.showModal();
  }
  function addRelated(event: FormEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!(event.target instanceof HTMLFormElement)) return;
    const parsed = z
      .string()
      .safeParse(new FormData(event.target).get("product"));
    if (!parsed.success) return;
    const item = relatedProducts.find((related) => related.id === parsed.data);
    if (!item) return;
    if ((cart[item.id] ?? 0) >= item.stock) {
      setNotice("موجودی نمونه کافی نیست.");
      return;
    }
    setCart((current) => ({
      ...current,
      [item.id]: (current[item.id] ?? 0) + 1,
    }));
    setNotice(
      "محصول مشابه به سبد آزمایشی همین صفحه اضافه شد؛ در سرور ثبت نشده است.",
    );
  }
  function purchaseControl() {
    if (isStorefront) {
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
                disabled={
                  cartPending || quantity >= Math.min(product.stock, 10)
                }
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
    return quantity > 0 ? (
      <div
        className={styles.quantity}
        role="group"
        aria-label="تعداد در سبد آزمایشی"
      >
        <button
          onClick={() => changeQuantity(1)}
          disabled={productCount >= product.stock}
          aria-label="افزایش تعداد"
        >
          <Plus size={18} />
        </button>
        <span>
          <output aria-live="polite">{toPersianDigits(quantity)}</output>
          <small>در سبد آزمایشی</small>
        </span>
        <button
          onClick={() => changeQuantity(-1)}
          aria-label={quantity === 1 ? "حذف از سبد آزمایشی" : "کاهش تعداد"}
        >
          <Minus size={18} />
        </button>
      </div>
    ) : (
      <Button
        className={styles.addButton}
        onClick={() => changeQuantity(1)}
        disabled={productCount >= product.stock}
      >
        <ShoppingCart size={19} aria-hidden="true" />
        {productCount >= product.stock
          ? realProduct
            ? "سقف موجودی ثبت‌شده"
            : "اتمام موجودی نمونه"
          : "افزودن به سبد خرید"}
      </Button>
    );
  }
  function renderImage(modal = false) {
    return (
      <Image
        src={relatedImage && modal ? relatedImage.src : view.src}
        alt={
          relatedImage && modal
            ? relatedImage.title
            : `${product.title}؛ ${toPersianDigits(view.label)}`
        }
        fill
        priority={!modal}
        sizes={
          modal
            ? "85vw"
            : "(min-width: 1024px) 34vw, (min-width: 768px) 50vw, 90vw"
        }
        className={styles.productImage}
        style={{
          transform: `scale(${relatedImage && modal ? (zoomed ? 1.4 : 1) : view.scale * (modal && zoomed ? 1.4 : 1)})`,
          transformOrigin: view.position,
        }}
      />
    );
  }

  return (
    <div
      className={styles.page}
      data-product-preview={isStorefront ? undefined : true}
      data-product-details={mode}
      data-product-id={product.id}
      data-product-source={realProduct ? "database" : "mock"}
    >
      {!isStorefront && (
        <FrosticHeader theme="light" cartCount={0} activeHref="/products" />
      )}
      <main className={styles.content}>
        <nav className={styles.breadcrumb} aria-label="مسیر صفحه">
          <Link href="/">لانچ‌اوکس</Link>
          <ChevronLeft size={14} />
          <Link href="/products">یخچال و فریزر</Link>
          <ChevronLeft size={14} />
          <span>{product.category.name}</span>
        </nav>
        {!isStorefront && (
          <p className={styles.previewNote}>
            {realProduct ? (
              <>
                پیش‌نمایش با اطلاعات محصول ثبت‌شدهٔ فروشگاه · سبد محلی آزمایشی
                است و در سرور ذخیره نمی‌شود.{" "}
              </>
            ) : (
              <>
                پیش‌نمایش طراحی · تمام مشخصات، رنگ‌ها، قیمت‌ها و دیدگاه‌ها
                نمونه‌اند.
              </>
            )}
            سبد آزمایشی: {toPersianDigits(cartCount)} کالا؛ با خروج از صفحه پاک
            می‌شود.
          </p>
        )}
        <section className={styles.hero} aria-labelledby="product-title">
          <div className={styles.galleryPanel}>
            <div className={styles.galleryTools}>
              <ProductLikeButton id={product.id} title={product.title} />
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
            <p className={styles.caption}>
              {toPersianDigits(view.label)}
              {!realProduct && " · جزئیات از همان تصویر موجود"}
            </p>
          </div>
          <div className={styles.summary}>
            <p className={styles.brand}>
              {realData ? (realData.brand ?? "برند نامشخص") : "لانچ‌اوکس"}{" "}
              <span>/ {product.category.name}</span>
            </p>
            <h1 id="product-title">
              {realProduct ? (
                toPersianDigits(product.title)
              ) : (
                <>
                  یخچال فریزر ساید بای ساید لانچ‌اوکس مدل{" "}
                  <bdi>{toPersianDigits(previewDetails.model)}</bdi>
                </>
              )}
            </h1>
            {isStorefront && (
              <CompareProductButton id={product.id} title={product.title} />
            )}
            <p className={styles.model}>
              {realProduct ? (
                realData?.model ? (
                  `مدل ${toPersianDigits(realData.model)}`
                ) : product.sku ? (
                  `شناسه کالا: ${toPersianDigits(product.sku)}`
                ) : (
                  product.category.name
                )
              ) : (
                <>سری خانگی · گنجایش {toPersianDigits(600)} لیتر</>
              )}
            </p>
            <div className={styles.rating}>
              {reviews.length > 0 ? (
                <>
                  <Star size={16} fill="currentColor" />
                  <strong>{toPersianDigits(4)}</strong>
                  <span>از {toPersianDigits(5)}</span>
                </>
              ) : (
                <span>هنوز امتیازی ثبت نشده</span>
              )}
              <a href="#customer-reviews">
                {toPersianDigits(reviews.length)} دیدگاه
              </a>
              <a href="#questions">{toPersianDigits(questions.length)} پرسش</a>
            </div>
            {realProduct ? (
              <p className={styles.caption}>
                رنگ محصول:{" "}
                {toPersianDigits(
                  realData?.color ??
                    (isStorefront
                      ? "اطلاعات رنگ در دسترس نیست"
                      : "ثبت نشده است"),
                )}
              </p>
            ) : (
              <>
                <fieldset className={styles.colors}>
                  <legend>
                    رنگ: <strong>{color.label}</strong>
                  </legend>
                  <div>
                    {previewDetails.colors.map((item) => (
                      <label
                        key={item.id}
                        data-selected={selectedColor === item.id}
                      >
                        <input
                          type="radio"
                          name="preview-color"
                          checked={selectedColor === item.id}
                          onChange={() => setSelectedColor(item.id)}
                        />
                        <span
                          className={styles.swatch}
                          style={{ background: item.swatch }}
                        >
                          {selectedColor === item.id && <Check size={14} />}
                        </span>
                        {item.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <p className={styles.caption}>
                  تصویر موجود نقره‌ای است؛ انتخاب رنگ فقط آزمایشی است.
                </p>
              </>
            )}
            <h2 className={styles.smallTitle}>ویژگی‌های اصلی</h2>
            <dl className={styles.features}>
              {product.attributes
                .filter(
                  (item) =>
                    !(
                      realProduct ? ["مدل", "رنگ", "برند"] : ["مدل", "رنگ"]
                    ).includes(item.key),
                )
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
              {!realProduct &&
                " اطلاعات این مدل برای ارزیابی طراحی تعریف شده است."}
            </p>
          </div>
          <aside className={styles.purchase} aria-label="خرید محصول">
            <div className={styles.seller}>
              <span className={styles.sellerIcon}>
                <Snowflake size={24} />
              </span>
              <div>
                <h2>فروشگاه لانچ‌اوکس</h2>
                <small>
                  فروشنده مستقیم{!realProduct && " · اطلاعات نمونه"}
                </small>
              </div>
              <ShieldCheck size={20} />
            </div>
            <div className={styles.serviceRow}>
              <ShieldCheck size={21} />
              <span>
                {realProduct ? (
                  toPersianDigits(
                    realData?.warranty ??
                      (isStorefront
                        ? "اطلاعات گارانتی در دسترس نیست"
                        : "اطلاعات گارانتی ثبت نشده است"),
                  )
                ) : (
                  <>
                    گارانتی {toPersianDigits(24)} ماهه لانچ‌اوکس
                    <small>شرایط گارانتی آزمایشی</small>
                  </>
                )}
              </span>
            </div>
            <div className={styles.serviceRow}>
              <Truck size={21} />
              <span>
                {realProduct ? (
                  toPersianDigits(
                    realData?.shipping ??
                      (isStorefront
                        ? "زمان ارسال مشخص نشده است"
                        : "زمان ارسال ثبت نشده است"),
                  )
                ) : (
                  <>
                    ارسال از انبار لانچ‌اوکس
                    <small>
                      تحویل {toPersianDigits("2 تا 4")} روز کاری · نمونه
                    </small>
                  </>
                )}
              </span>
            </div>
            <div className={styles.serviceRow}>
              <Check size={21} />
              <span
                className={product.stock > 0 ? styles.available : undefined}
              >
                {product.stock > 0 ? "موجود در انبار" : "ناموجود"}
                {!realProduct && " نمونه"}
                <small>
                  {toPersianDigits(product.stock)} عدد
                  {!realProduct && " برای همه رنگ‌ها"}
                </small>
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
            {!isStorefront && (
              <p className={styles.caption}>
                سبد محلی آزمایشی؛ خرید واقعی انجام نمی‌شود.
              </p>
            )}
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
          role={isStorefront && cartState && !cartState.ok ? "alert" : "status"}
          aria-live="polite"
        >
          {isStorefront && cartState && !cartState.ok
            ? cartState.error
            : notice}
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
          <p className={styles.sectionSubtitle}>
            {realProduct
              ? isStorefront
                ? "درباره این محصول"
                : "معرفی ثبت‌شدهٔ محصول"
              : "فضای بیشتر برای تازگی هر روز"}
          </p>
          <div id="product-description">
            <p>
              {toPersianDigits(
                realProduct && descriptionNeedsExpansion && !expanded
                  ? `${product.description.slice(0, 280)}…`
                  : product.description,
              )}
            </p>
            {expanded && !realProduct && (
              <>
                <p>
                  ظرفیت {toPersianDigits(600)} لیتری نمونه، فضای مجزایی برای
                  مواد غذایی تازه و منجمد فراهم می‌کند. طبقات قابل تنظیم، کشوهای
                  اختصاصی و محفظه‌های روی در، چیدمان مواد غذایی را ساده‌تر
                  می‌کنند. گردش چندگانه هوا برای توزیع یکنواخت سرما در نظر گرفته
                  شده است.
                </p>
                <p>
                  کمپرسور اینورتر و روشنایی داخلی کم‌مصرف، بخشی از مشخصات
                  آزمایشی این مدل هستند. برای انتخاب نهایی، ابعاد واقعی، مصرف
                  انرژی، شرایط نصب و گارانتی محصول باید با اطلاعات رسمی سازنده
                  تطبیق داده شوند.
                </p>
              </>
            )}
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
          <p className={styles.sectionSubtitle}>
            {realProduct ? (
              isStorefront ? (
                "اطلاعات فنی محصول"
              ) : (
                "مشخصات ثبت‌شدهٔ محصول"
              )
            ) : (
              <>
                اطلاعات کامل مدل نمونه {toPersianDigits(previewDetails.model)}
              </>
            )}
          </p>
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
        <section id="customer-reviews" className={styles.infoSection}>
          <h2>امتیاز و دیدگاه کاربران</h2>
          {reviews.length === 0 ? (
            <div className={styles.feedbackEmpty}>
              <span className={styles.feedbackEmptyIcon}>
                <Star size={30} aria-hidden="true" />
              </span>
              <h3>هنوز دیدگاهی برای این محصول ثبت نشده است.</h3>
              <p>تجربه شما می‌تواند به دیگران در انتخاب این محصول کمک کند.</p>
              <small>
                {isStorefront
                  ? "ثبت دیدگاه هنوز فعال نشده است."
                  : "ثبت دیدگاه در این پیش‌نمایش فعال نیست."}
              </small>
            </div>
          ) : (
            <>
              <p className={styles.sectionSubtitle}>
                دیدگاه‌های زیر ساختگی و صرفاً برای بررسی طراحی هستند؛ ثبت دیدگاه
                فعال نیست.
              </p>
              <div className={styles.reviewLayout}>
                <aside className={styles.reviewSummary}>
                  <strong>
                    {toPersianDigits(4)} <small>از {toPersianDigits(5)}</small>
                  </strong>
                  <div
                    className={styles.stars}
                    aria-label="امتیاز نمونه ۴ از ۵"
                  >
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        size={19}
                        fill={index < 4 ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                  <span>
                    از مجموع {toPersianDigits(reviews.length)} دیدگاه نمونه
                  </span>
                  <p>تجربه دیگران، برای انتخابی آگاهانه‌تر</p>
                </aside>
                <div>
                  <label className={styles.sort}>
                    مرتب‌سازی دیدگاه‌ها
                    <select
                      value={sort}
                      onChange={(event) => {
                        const parsed = sortSchema.safeParse(event.target.value);
                        if (parsed.success) setSort(parsed.data);
                      }}
                    >
                      <option value="helpful">مفیدترین</option>
                      <option value="newest">جدیدترین</option>
                      <option value="highest">بیشترین امتیاز</option>
                    </select>
                  </label>
                  <div data-review-list>
                    {sortedReviews.map((review) => (
                      <article
                        className={styles.review}
                        key={review.id}
                        data-review-id={review.id}
                      >
                        <div className={styles.reviewMeta}>
                          <span className={styles.ratingBadge}>
                            <Star size={14} fill="currentColor" />
                            {toPersianDigits(review.rating)}
                          </span>
                          <span>{review.name}</span>
                          {review.buyer && (
                            <span className={styles.buyer}>خریدار نمونه</span>
                          )}
                          <time dateTime={review.date}>
                            {formatDate(review.date)}
                          </time>
                        </div>
                        <h3>{review.title}</h3>
                        <p>{review.text}</p>
                        <small>
                          {toPersianDigits(review.helpful)} رأی مفید · داده
                          نمونه
                        </small>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
        <section id="questions" className={styles.infoSection}>
          <h2>پرسش و پاسخ</h2>
          {questions.length === 0 ? (
            <div className={styles.feedbackEmpty}>
              <span className={styles.feedbackEmptyIcon}>
                <MessageCircle size={30} aria-hidden="true" />
              </span>
              <h3>هنوز پرسشی درباره این محصول ثبت نشده است.</h3>
              <p>پرسش‌های شما می‌توانند انتخاب را برای دیگران آسان‌تر کنند.</p>
              <small>
                {isStorefront
                  ? "ارسال پرسش هنوز فعال نشده است."
                  : "ارسال پرسش در این پیش‌نمایش فعال نیست."}
              </small>
            </div>
          ) : (
            <>
              <p className={styles.sectionSubtitle}>
                پرسش‌های نمونه؛ ارسال پرسش در این پیش‌نمایش فعال نیست.
              </p>
              {questions.map((item) => (
                <details className={styles.question} key={item.question}>
                  <summary>
                    <MessageCircle size={21} />
                    {item.question}
                    <Plus size={18} />
                  </summary>
                  <p>
                    <strong>پاسخ نمونه لانچ‌اوکس: </strong>
                    {toPersianDigits(item.answer)}
                  </p>
                </details>
              ))}
            </>
          )}
        </section>
        <RelatedProductsCarousel
          products={relatedProducts}
          onSubmitCapture={isStorefront ? undefined : addRelated}
          onClickCapture={isStorefront ? undefined : previewRelated}
        />
      </main>
      {!isStorefront && <StoreFooter />}
      <div
        className={styles.mobileBuy}
        aria-label={isStorefront ? "خرید سریع" : "خرید سریع آزمایشی"}
      >
        <div>
          <small>{realProduct ? "قیمت محصول" : "قیمت نمونه"}</small>
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
          if (relatedImage) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            moveImage(event.key === "ArrowLeft" ? 1 : -1);
          }
        }}
      >
        <div className={styles.dialogHeading}>
          <h2 id="image-dialog-title">
            {relatedImage?.title ??
              `گالری محصول · ${toPersianDigits(view.label)}`}
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
        {!relatedImage && (
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
        )}
        <p className={styles.caption}>
          {!isStorefront && "تصویر موجود پروژه؛ "}برای بزرگ‌نمایی روی تصویر
          بزنید.
        </p>
      </dialog>
    </div>
  );
}
