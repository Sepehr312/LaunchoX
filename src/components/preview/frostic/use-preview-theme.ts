"use client";

import { useSyncExternalStore } from "react";

export type FrosticTheme = "light" | "dark" | "system";
const storageKey = "launchox-preview-theme";
const changeEvent = "frostic-preview-theme";
let fallback: FrosticTheme = "system";

function snapshot(): FrosticTheme {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Keep manual theme switching usable when browser storage is unavailable.
    if (fallback !== "system") return fallback;
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(callback: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener(changeEvent, callback);
  window.addEventListener("storage", callback);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener(changeEvent, callback);
    window.removeEventListener("storage", callback);
    media.removeEventListener("change", callback);
  };
}

// Share the preference with the header, preview sections, and site theme bridge.
export function usePreviewTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    snapshot,
    () => "system" as const,
  );
  function setTheme(value: FrosticTheme) {
    fallback = value;
    try {
      if (value === "system") localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, value);
    } catch {
      // The in-memory preference lasts for this page when storage is blocked.
    }
    window.dispatchEvent(new Event(changeEvent));
  }
  return {
    theme,
    setTheme,
    toggleTheme: () => setTheme(snapshot() === "dark" ? "light" : "dark"),
  };
}
