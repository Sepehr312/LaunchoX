"use server";
import { requireUser } from "@/lib/auth";
import {
  mergeFavorites,
  setFavorite,
  favoriteIds,
} from "@/services/favorite.service";
import { revalidatePath } from "next/cache";
export async function mergeFavoritesAction(input: unknown) {
  const user = await requireUser();
  const ids = await mergeFavorites(user.id, input);
  revalidatePath("/account/favorites");
  return ids;
}
export async function setFavoriteAction(input: unknown) {
  const user = await requireUser();
  const ids = await setFavorite(user.id, input);
  revalidatePath("/account/favorites");
  return ids;
}
export async function readFavoritesAction() {
  const user = await requireUser();
  return favoriteIds(user.id);
}
