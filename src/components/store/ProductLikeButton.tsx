"use client";

import { useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import styles from "./ArcticProducts.module.css";

const changeEvent = "launchox-product-like";
const fallbackLikes = new Set<string>();

function subscribe(callback: () => void) {
  window.addEventListener(changeEvent, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(changeEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

export function ProductLikeButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const storageKey = `launchox-product-like:${id}`;
  function snapshot() {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return fallbackLikes.has(id);
    }
  }
  const liked = useSyncExternalStore(subscribe, snapshot, () => false);

  function toggleLike() {
    const next = !snapshot();
    if (next) fallbackLikes.add(id);
    else fallbackLikes.delete(id);
    try {
      if (next) localStorage.setItem(storageKey, "1");
      else localStorage.removeItem(storageKey);
    } catch {
      // Keep likes usable for this session when browser storage is blocked.
    }
    window.dispatchEvent(new Event(changeEvent));
  }

  return (
    <button
      type="button"
      className={styles.favorite}
      aria-label={`${liked ? "لغو پسندیدن" : "پسندیدن"} ${title}`}
      aria-pressed={liked}
      onClick={toggleLike}
    >
      <Heart
        size={17}
        fill={liked ? "currentColor" : "none"}
        aria-hidden="true"
      />
    </button>
  );
}
