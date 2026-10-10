import { ProductCard } from "@/components/store/ProductCard";
import type { StoreProductDTO } from "@/types/dto";

export function ProductGrid({
  products,
  emptyTitle = "محصولی برای نمایش وجود ندارد",
  emptyMessage = "محصولی با این مشخصات پیدا نشد.",
}: {
  products: StoreProductDTO[];
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  if (!products.length)
    return (
      <div className="empty-state">
        <span aria-hidden="true">❄</span>
        <h2>{emptyTitle}</h2>
        <p>{emptyMessage}</p>
      </div>
    );
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
