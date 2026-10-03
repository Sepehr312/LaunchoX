import Image from "next/image";
import Link from "next/link";
import { ChevronIcon, EnergyIcon } from "@/components/store/Icons";
import { formatPrice, toPersianDigits } from "@/lib/format";
import type { StoreProductDTO } from "@/types/dto";

function attribute(product: StoreProductDTO, key: string) {
  return product.attributes.find((item) => item.key === key)?.value;
}

export function ProductCard({ product }: { product: StoreProductDTO }) {
  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : null;
  const brand = attribute(product, "برند") ?? product.category.name;
  const specs = product.attributes
    .filter((item) => item.key !== "برند")
    .slice(0, 3);
  return (
    <article className="product-card group">
      <div className="product-image-wrap">
        <Image
          src={product.images[0]}
          alt={product.title}
          fill
          sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
          className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
        />
        {discount !== null && (
          <span className="discount-badge">
            ٪{toPersianDigits(discount)} تخفیف
          </span>
        )}
        {product.stock === 0 && <span className="stock-badge">ناموجود</span>}
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted">
          <span className="font-semibold tracking-wide text-primary">
            {brand}
          </span>
          <Link
            href={`/categories/${product.category.slug}`}
            className="hover:text-primary"
          >
            {product.category.name}
          </Link>
        </div>
        <h3 className="line-clamp-2 min-h-14 text-base leading-7 font-bold">
          <Link
            href={`/products/${product.slug}`}
            className="after:absolute after:inset-0"
          >
            {product.title}
          </Link>
        </h3>
        {specs.length > 0 && (
          <dl className="my-4 grid grid-cols-3 gap-1.5">
            {specs.map((spec) => (
              <div key={spec.key} className="mini-spec">
                {spec.key.includes("انرژی") && (
                  <EnergyIcon className="mx-auto mb-1 size-4" />
                )}
                <dt>{spec.key}</dt>
                <dd>{spec.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border/60 pt-4">
          <div>
            {product.compareAtPrice && (
              <del className="block text-xs text-muted">
                {formatPrice(product.compareAtPrice)}
              </del>
            )}
            <strong className="text-base text-foreground sm:text-lg">
              {formatPrice(product.price)}
            </strong>
          </div>
          <span className="product-link" aria-hidden="true">
            <ChevronIcon className="size-5" />
          </span>
        </div>
      </div>
    </article>
  );
}
