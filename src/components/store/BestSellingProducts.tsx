"use client";

import { ProductGrid } from "@/components/store/ProductGrid";
import { usePreviewTheme } from "@/components/preview/frostic/use-preview-theme";
import type { StoreProductDTO } from "@/types/dto";
import styles from "./ArcticProducts.module.css";

export function BestSellingProducts({
  products,
}: {
  products: StoreProductDTO[];
}) {
  const { theme } = usePreviewTheme();
  return (
    <section
      className={styles.section}
      data-theme={theme}
      aria-labelledby="bestselling-products-title"
    >
      <div className={styles.panel}>
        <div className={styles.heading}>
          <h2 id="bestselling-products-title">محصولات پرفروش</h2>
        </div>
        <ProductGrid
          products={products}
          emptyTitle="هنوز محصولی برای نمایش وجود ندارد"
          emptyMessage="محصولات پرفروش پس از اضافه شدن محصولات در این بخش نمایش داده می‌شوند."
        />
      </div>
    </section>
  );
}
