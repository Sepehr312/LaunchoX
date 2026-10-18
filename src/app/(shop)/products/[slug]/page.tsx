import { cache } from "react";
import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetails } from "@/components/store/ProductDetails";
import { getCurrentCart } from "@/actions/cart.actions";
import { routeSlugSchema } from "@/validations/common";
import {
  getProductBySlug,
  getRelatedProducts,
  listProducts,
} from "@/services/product.service";

export const revalidate = 300;
export const dynamicParams = true;

const loadProduct = cache(async (slug: string) => {
  const parsed = routeSlugSchema.safeParse(slug);
  if (!parsed.success) notFound();
  const product = await getProductBySlug(parsed.data);
  if (!product) notFound();
  return product;
});

export async function generateStaticParams() {
  const products = await listProducts({ page: 1, limit: 48, sort: "newest" });
  return products.items.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const product = await loadProduct((await params).slug);
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
  const product = await loadProduct((await params).slug);
  const [related, cart] = await Promise.all([
    getRelatedProducts(product.id, product.category.id, 9),
    getCurrentCart(),
  ]);
  const quantity =
    cart.items.find((item) => item.product.id === product.id)?.quantity ?? 0;
  return (
    <ProductDetails
      key={product.id}
      mode="storefront"
      realProduct={product}
      realRelatedProducts={related}
      initialQuantity={quantity}
      feedbackState="empty"
    />
  );
}
