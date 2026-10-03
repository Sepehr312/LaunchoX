import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreHeader } from "@/components/store/StoreHeader";
import { listCategories } from "@/services/category.service";

export const revalidate = 300;

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await listCategories();
  return (
    <>
      <StoreHeader categories={categories} />
      <div className="flex flex-1 flex-col">{children}</div>
      <StoreFooter categories={categories} />
    </>
  );
}
