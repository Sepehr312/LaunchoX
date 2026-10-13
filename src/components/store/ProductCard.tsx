"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { addCartAction } from "@/actions/cart.actions";
import { ProductLikeButton } from "@/components/store/ProductLikeButton";
import { usePreviewTheme } from "@/components/preview/frostic/use-preview-theme";
import { formatPrice, toPersianDigits } from "@/lib/format";
import type { StoreProductDTO } from "@/types/dto";
import styles from "./ArcticProducts.module.css";

export function ProductCard({ product }: { product: StoreProductDTO }) {
  const { theme } = usePreviewTheme();
  const [state, formAction, pending] = useActionState(addCartAction, undefined);
  const model = product.attributes.find((item) => item.key === "مدل");
  const specs = product.attributes
    .filter((item) => item.key !== "برند" && item.key !== "مدل")
    .slice(0, 3);
  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : null;

  return (
    <article
      className={styles.card}
      data-theme={theme}
      data-arctic-product-card
    >
      <div className={styles.cardTop}>
        <ProductLikeButton id={product.id} title={product.title} />
      </div>
      <div className={styles.badges}>
        {product.stock === 0 && <span>ناموجود</span>}
        {discount !== null && <span>٪{toPersianDigits(discount)} تخفیف</span>}
      </div>
      <Link href={`/products/${product.slug}`} className={styles.body}>
        <div className={styles.info}>
          <h3>{toPersianDigits(product.title)}</h3>
          {model && (
            <p className={styles.model}>مدل {toPersianDigits(model.value)}</p>
          )}
          {specs.length > 0 && (
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
            sizes="(min-width: 1024px) 110px, (min-width: 640px) 140px, 110px"
            className="object-contain"
          />
        </div>
      </Link>
      <div className={styles.footer}>
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
        <div className={styles.prices}>
          {product.compareAtPrice && (
            <del>{formatPrice(product.compareAtPrice)}</del>
          )}
          <strong>{formatPrice(product.price)}</strong>
        </div>
      </div>
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
