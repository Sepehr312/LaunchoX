import type { Metadata } from "next";
import { listBrands } from "@/services/brand.service";
import { listProducts } from "@/services/product.service";
import { BrandsListing } from "@/components/store/BrandsListing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "برندهای یخچال و فریزر | لانچ‌اوکس",
  description:
    "برند مورد علاقه‌ات رو پیدا کن؛ بررسی برندهای یخچال و فریزر در لانچ‌اوکس.",
};

export default async function BrandsPage() {
  const records = (await listBrands()).filter((brand) => brand.isActive);
  const brands = await Promise.all(
    records.map(async (brand) => {
      const products = await listProducts({
        brands: [brand.name],
        page: 1,
        limit: 1,
        sort: "newest",
      });
      return {
        name: brand.name,
        slug: brand.slug,
        logo: brand.logo,
        productCount: products.total,
      };
    }),
  );
  return <BrandsListing brands={brands} />;
}
