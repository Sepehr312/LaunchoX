import { parseCompareIds } from "@/validations/compare";

const storageKey = "launchox:comparison";
const changeEvent = "launchox:comparison-changed";

export function readComparisonSelection(): string {
  try {
    return parseCompareIds(window.localStorage.getItem(storageKey)).join(",");
  } catch {
    return "";
  }
}

export function writeComparisonSelection(ids: string[]) {
  try {
    window.localStorage.setItem(
      storageKey,
      parseCompareIds(ids.join(",")).join(","),
    );
    window.dispatchEvent(new Event(changeEvent));
  } catch {
    // URL selections still work when browser storage is unavailable.
  }
}

export function subscribeComparisonSelection(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(changeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(changeEvent, onChange);
  };
}

export function comparisonHref(ids: string[]) {
  return `/compare?${new URLSearchParams({ products: parseCompareIds(ids.join(",")).join(",") })}`;
}
