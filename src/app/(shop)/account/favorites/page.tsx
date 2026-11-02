import { requireUser } from "@/lib/auth";
import { listFavorites } from "@/services/favorite.service";
import { ProductGrid } from "@/components/store/ProductGrid";
export default async function FavoritesPage() {
  const user = await requireUser();
  const products = await listFavorites(user.id);
  return (
    <section className="grid gap-6">
      <h1 className="text-2xl font-bold">علاقه‌مندی‌های من</h1>
      {products.length ? (
        <ProductGrid products={products} />
      ) : (
        <p>هنوز محصولی به علاقه‌مندی‌ها اضافه نکرده‌اید.</p>
      )}
    </section>
  );
}
