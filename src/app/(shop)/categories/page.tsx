import type { Metadata } from "next";
import { CategoriesListing } from "@/components/store/CategoriesListing";
import { listStoreCategories } from "@/services/category.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "دسته‌بندی‌های یخچال و فریزر | لانچ‌اوکس",
  description:
    "انواع یخچال و فریزر را بشناسید و متناسب با فضای آشپزخانه و نیازتان، دستهٔ مناسب را انتخاب کنید.",
};

export default async function CategoriesPage() {
  return <CategoriesListing categories={await listStoreCategories()} />;
}
