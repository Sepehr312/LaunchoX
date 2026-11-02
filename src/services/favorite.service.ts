import "server-only";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Favorite } from "@/models/favorite";
import { Product } from "@/models/product";
import { objectIdSchema } from "@/validations/common";
import { getFavoriteProducts } from "@/services/product.service";
export const favoriteIdsSchema = z.array(objectIdSchema).max(200);
export async function favoriteIds(userId: string) {
  const user = objectIdSchema.parse(userId);
  await connectDB();
  return (await Favorite.find({ user }).select("product").lean()).map((e) =>
    String(e.product),
  );
}
export async function mergeFavorites(userId: string, input: unknown) {
  const user = objectIdSchema.parse(userId);
  const ids = favoriteIdsSchema.parse(input);
  await connectDB();
  const products = await Product.find({ _id: { $in: ids }, isActive: true })
    .select("_id")
    .lean();
  for (const product of products) {
    try {
      await Favorite.updateOne(
        { user, product: product._id },
        { $setOnInsert: { user, product: product._id } },
        { upsert: true },
      );
    } catch (error) {
      if (!(
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ))
        throw error;
    }
  }
  return favoriteIds(user);
}
export async function setFavorite(userId: string, input: unknown) {
  const user = objectIdSchema.parse(userId);
  const { id, liked } = z
    .object({ id: objectIdSchema, liked: z.boolean() })
    .parse(input);
  await connectDB();
  if (liked) await mergeFavorites(user, [id]);
  else await Favorite.deleteOne({ user, product: id });
  return favoriteIds(user);
}
export async function listFavorites(userId: string) {
  return getFavoriteProducts(await favoriteIds(userId));
}
