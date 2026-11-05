import { FavoritesProvider } from "@/components/store/FavoritesProvider";
import { favoriteIds } from "@/services/favorite.service";
import { getCurrentUser } from "@/actions/auth.actions";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreHeader } from "@/components/store/StoreHeader";
import { listCategories } from "@/services/category.service";
import { getCurrentCart } from "@/actions/cart.actions";
import { readContent } from "@/services/content.service";

export const revalidate = 300;
// Storefront content and session data require the runtime database, not build access.
export const dynamic = "force-dynamic";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await listCategories();
  const cart = await getCurrentCart();
  const user = await getCurrentUser();
  const about = await readContent("about");
  return (
    <FavoritesProvider
      key={user?.id ?? "guest"}
      userId={user?.id}
      initial={user ? await favoriteIds(user.id) : []}
    >
      <StoreHeader
        categories={categories}
        cartCount={cart.count}
        authenticated={Boolean(user)}
        showAbout={about?.key !== "about" || about.data.isActive}
      />
      <div className="flex flex-1 flex-col">{children}</div>
      <StoreFooter />
    </FavoritesProvider>
  );
}
