"use client";
import { Heart } from "lucide-react";
import { useFavorites } from "@/components/store/FavoritesProvider";
import styles from "./ArcticProducts.module.css";
export function ProductLikeButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const { ids, pending, toggle } = useFavorites();
  const liked = ids.includes(id);
  return (
    <button
      type="button"
      className={styles.favorite}
      aria-label={(liked ? "لغو پسندیدن" : "پسندیدن") + " " + title}
      aria-pressed={liked}
      disabled={pending}
      onClick={() => void toggle(id)}
    >
      <Heart
        size={17}
        fill={liked ? "currentColor" : "none"}
        aria-hidden="true"
      />
    </button>
  );
}
