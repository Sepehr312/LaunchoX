import type { Metadata } from "next";
import { ComparePage } from "@/components/store/compare/ComparePage";
import { getComparisonProducts } from "@/services/product.service";
import { parseCompareIds } from "@/validations/compare";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "مقایسه محصولات | لانچ‌اوکس",
  description:
    "قیمت، ظرفیت و مشخصات فنی یخچال و فریزرها را کنار هم مقایسه کنید.",
  robots: { index: false, follow: true },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const ids = parseCompareIds(params.products);
  const products = await getComparisonProducts(ids);
  return (
    <ComparePage
      key={ids.join(",")}
      initialProducts={products}
      requestedCount={ids.length}
      persistSelection
    />
  );
}
