import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/store/ProductGallery";
import { CartForm } from "@/components/store/CartForm";
import { ProductGrid } from "@/components/store/ProductGrid";
import { SectionHeading } from "@/components/store/SectionHeading";
import { ChevronIcon, EnergyIcon, ShieldIcon } from "@/components/store/Icons";
import { formatPrice, toPersianDigits } from "@/lib/format";
import {
  getProductBySlug,
  getRelatedProducts,
  listProducts,
} from "@/services/product.service";

export const revalidate = 300;
export const dynamicParams = false;

export async function generateStaticParams() {
  const products = await listProducts({
    page: 1,
    limit: 48,
    sort: "newest",
  });
  return products.items.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  return {
    title: `${product.title} | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
    description: product.description,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const related = await getRelatedProducts(product.id, product.category.id, 4);
  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : null;
  return (
    <main className="product-page">
      <div className="store-shell py-6 sm:py-10">
        <nav className="breadcrumbs" aria-label="مسیر صفحه">
          <Link href="/">خانه</Link>
          <ChevronIcon className="size-4" />
          <Link href="/products">محصولات</Link>
          <ChevronIcon className="size-4" />
          <span>{product.title}</span>
        </nav>
        <div className="product-detail-grid">
          <ProductGallery images={product.images} title={product.title} />
          <section className="product-summary">
            <p className="section-kicker">{product.category.name}</p>
            <h1>{product.title}</h1>
            <p className="product-description">{product.description}</p>
            <div className="product-price-block">
              {discount !== null && (
                <span className="discount-badge static">
                  ٪{toPersianDigits(discount)} تخفیف
                </span>
              )}
              <div>
                {product.compareAtPrice && (
                  <del>{formatPrice(product.compareAtPrice)}</del>
                )}
                <strong>{formatPrice(product.price)}</strong>
              </div>
            </div>
            <div className="availability-row">
              <span className={product.stock > 0 ? "available" : "unavailable"}>
                {product.stock > 0 ? "موجود در انبار" : "در حال حاضر ناموجود"}
              </span>
              {product.sku && <span>شناسه: {product.sku}</span>}
            </div>
            <CartForm product={product.id} stock={product.stock} />
            <div className="product-assurance">
              <div>
                <ShieldIcon className="size-6" />
                <span>
                  <strong>ضمانت اصالت</strong>
                  <small>کالای معتبر</small>
                </span>
              </div>
              <div>
                <EnergyIcon className="size-6" />
                <span>
                  <strong>انتخاب کم‌مصرف</strong>
                  <small>مشخصات شفاف</small>
                </span>
              </div>
            </div>
          </section>
        </div>
        <section className="specification-section">
          <div>
            <p className="section-kicker">جزئیات فنی</p>
            <h2>مشخصات محصول</h2>
            <p>اطلاعات اصلی برای مقایسهٔ دقیق‌تر مدل‌ها.</p>
          </div>
          {!product.attributes.length && (
            <p className="text-sm text-muted">
              مشخصات فنی این محصول هنوز ثبت نشده است.
            </p>
          )}
          <dl>
            {product.attributes.map((item) => (
              <div key={item.key}>
                <dt>{item.key}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="store-section px-0 pb-0">
          <SectionHeading eyebrow="انتخاب‌های مشابه" title="محصولات مرتبط" />
          <ProductGrid
            products={related}
            emptyTitle="محصول مرتبطی برای نمایش وجود ندارد"
            emptyMessage="محصول مرتبط دیگری در این دسته موجود نیست."
          />
        </section>
      </div>
    </main>
  );
}
