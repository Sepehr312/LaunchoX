import type { Metadata } from "next";
import { BrandsListing } from "@/components/store/BrandsListing";
import { listStoreBrands } from "@/services/brand.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "برندهای یخچال و فریزر | لانچ‌اوکس",
  description:
    "برندهای یخچال و فریزر را پیدا کنید و محصولات برند دلخواهتان را ببینید.",
};

export default async function BrandsPage() {
  return <BrandsListing brands={await listStoreBrands()} />;
}
