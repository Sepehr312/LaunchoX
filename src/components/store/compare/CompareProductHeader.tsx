import Image from "next/image";
import Link from "next/link";
import { Plus, X, ArrowUpLeft } from "lucide-react";
import { getRealPreviewData } from "@/components/store/product-details-data";
import { formatPrice, toPersianDigits } from "@/lib/format";
import type { CompareProductDTO } from "@/types/dto";
import styles from "./compare.module.css";

export function CompareProductHeader({
  products,
  onRemove,
  onPick,
  fixture,
}: {
  products: CompareProductDTO[];
  onRemove: (id: string) => void;
  onPick: () => void;
  fixture: boolean;
}) {
  return (
    <div className={`${styles.canvas} ${styles.productGrid}`}>
      <div className={styles.introCell}>
        <span>انتخاب‌های تو</span>
        <strong>
          {toPersianDigits(products.length)} / {toPersianDigits(4)}
        </strong>
        <p>جزئیات را کنار هم ببین.</p>
      </div>
      {products.map((product) => {
        const details = getRealPreviewData(product);
        return (
          <article key={product.id} className={styles.product}>
            <button
              onClick={() => onRemove(product.id)}
              className={`${styles.iconButton} ${styles.remove}`}
              aria-label={`حذف ${product.title} از مقایسه`}
            >
              <X size={18} />
            </button>
            <div className={styles.image}>
              <Image
                src={product.images[0]}
                alt={product.title}
                fill
                sizes="(max-width: 767px) 120px, 220px"
                className="object-contain"
              />
            </div>
            <p className={styles.brand}>{details.brand ?? "برند ثبت نشده"}</p>
            <h2>{toPersianDigits(product.title)}</h2>
            <div className={styles.priceHistory}>
              {details.discountPercent > 0 && product.compareAtPrice && (
                <>
                  <del>{formatPrice(product.compareAtPrice)}</del>
                  <span>{toPersianDigits(details.discountPercent)}٪</span>
                </>
              )}
            </div>
            <strong className={styles.price}>
              {formatPrice(product.price)}
            </strong>
            <p className={styles.stock}>
              {product.stock > 0 ? "موجود در فروشگاه" : "ناموجود"}
            </p>
            {fixture ? (
              <span className={styles.hint}>محصول نمونهٔ آزمایشی</span>
            ) : (
              <Link
                className={styles.productLink}
                href={`/products/${product.slug}`}
              >
                مشاهده محصول <ArrowUpLeft size={16} />
              </Link>
            )}
          </article>
        );
      })}
      {products.length < 4 && (
        <button className={styles.addProduct} onClick={onPick}>
          <span>
            <Plus size={26} />
          </span>
          <strong>افزودن محصول</strong>
          <small>برای انتخابی دقیق‌تر</small>
        </button>
      )}
    </div>
  );
}
