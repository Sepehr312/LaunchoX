"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { addCartAction } from "@/actions/cart.actions";
import { ProductLikeButton } from "@/components/store/ProductLikeButton";
import { CompareProductButton } from "@/components/store/compare/CompareProductButton";
import { formatPrice, toPersianDigits } from "@/lib/format";
import type { StoreProductDTO } from "@/types/dto";
import styles from "./ArcticProducts.module.css";

export function ProductCard({
  product,
  variant = "default",
}: {
  product: StoreProductDTO;
  variant?: "default" | "compact";
}) {
  const [state, formAction, pending] = useActionState(addCartAction, undefined);
  const model = product.attributes.find((item) => item.key === "مدل");
  const specs = product.attributes
    .filter((item) => item.key !== "برند" && item.key !== "مدل")
    .slice(0, 3);
  const showPreviousPrice = product.pricing.hasDiscount;
  const discount = showPreviousPrice ? product.pricing.discountPercent : null;

  return (
    <article
      className={styles.card}
      data-arctic-product-card
      data-variant={variant}
    >
      {variant === "default" && (
        <div className={styles.cardTop}>
          <ProductLikeButton id={product.id} title={product.title} />
          <CompareProductButton
            id={product.id}
            title={product.title}
            iconOnly
          />
        </div>
      )}
      {variant === "default" && (
        <div className={styles.badges}>
          {product.stock === 0 && <span>ناموجود</span>}
          {discount !== null && <span>٪{toPersianDigits(discount)} تخفیف</span>}
        </div>
      )}
      <Link
        href={`/products/${product.slug}`}
        className={styles.body}
        prefetch={variant === "compact" ? false : undefined}
      >
        <div className={styles.info}>
          <h3
            title={
              variant === "compact" ? toPersianDigits(product.title) : undefined
            }
          >
            {toPersianDigits(product.title)}
          </h3>
          {variant === "default" && model && (
            <p className={styles.model}>مدل {toPersianDigits(model.value)}</p>
          )}
          {variant === "default" && specs.length > 0 && (
            <dl className={styles.specs}>
              {specs.map((spec) => (
                <div key={spec.key}>
                  <dt>{spec.key}</dt>
                  <dd>
                    <bdi>{toPersianDigits(spec.value)}</bdi>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className={styles.image}>
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            sizes={
              variant === "compact"
                ? "(min-width: 1280px) 190px, (min-width: 768px) 170px, 45vw"
                : "(min-width: 1024px) 110px, (min-width: 640px) 140px, 110px"
            }
            className="object-contain"
          />
        </div>
      </Link>
      <div className={styles.footer}>
        {variant === "default" && (
          <form action={formAction}>
            <input type="hidden" name="product" value={product.id} />
            <input type="hidden" name="quantity" value="1" />
            <button
              type="submit"
              className={styles.cart}
              disabled={pending || product.stock === 0}
              aria-label={
                pending
                  ? "در حال افزودن…"
                  : `افزودن به سبد خرید: ${product.title}`
              }
            >
              {state?.ok ? <Check size={18} /> : <ShoppingCart size={18} />}
            </button>
          </form>
        )}
        <div className={styles.prices}>
          {variant === "compact" ? (
            <div className={styles.compactHistory}>
              {showPreviousPrice && (
                <del>{formatPrice(product.pricing.originalPrice)}</del>
              )}
              {discount !== null && discount > 0 && (
                <span className={styles.compactDiscount}>
                  {toPersianDigits(discount)}٪
                </span>
              )}
              {product.stock === 0 && <span>ناموجود</span>}
            </div>
          ) : (
            showPreviousPrice && (
              <del>{formatPrice(product.pricing.originalPrice)}</del>
            )
          )}
          <strong>{formatPrice(product.pricing.finalPrice)}</strong>
        </div>
      </div>
      {variant === "compact" && (
        <CompareProductButton id={product.id} title={product.title} />
      )}
      {state && !state.ok && (
        <p className={styles.feedback} role="alert">
          {state.error}
        </p>
      )}
      <span className={styles.status} role="status">
        {state?.ok ? "به سبد خرید اضافه شد" : ""}
      </span>
    </article>
  );
}
