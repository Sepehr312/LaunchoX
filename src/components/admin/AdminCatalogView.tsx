"use client";

import {
  useCallback,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import { adminCatalogViewSchema } from "@/validations/admin-list";
import { cn } from "@/lib/utils";
import styles from "@/components/admin/AdminCatalogView.module.css";

const preferenceChangeEvent = "launchox:admin-catalog-view";

function subscribeToPreference(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(preferenceChangeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(preferenceChangeEvent, onChange);
  };
}

function getServerView() {
  return "table" as const;
}

export function AdminCatalogView({
  entity,
  count,
  table,
  cards,
  empty,
  hasItems,
}: {
  entity: "brands" | "categories";
  count: string;
  table: ReactNode;
  cards: ReactNode;
  empty: ReactNode;
  hasItems: boolean;
}) {
  const [fallbackView, setFallbackView] = useState<"table" | "cards" | null>(
    null,
  );
  const storageKey = `launchox:admin:${entity}:view`;
  const regionId = `admin-${entity}-view`;
  const getView = useCallback(() => {
    try {
      const saved = adminCatalogViewSchema.safeParse(
        localStorage.getItem(storageKey),
      );
      return saved.success ? saved.data : "table";
    } catch {
      // The view remains usable when browser storage is unavailable.
      return "table";
    }
  }, [storageKey]);
  const savedView = useSyncExternalStore(
    subscribeToPreference,
    getView,
    getServerView,
  );
  const view = fallbackView ?? savedView;

  function selectView(next: "table" | "cards") {
    try {
      localStorage.setItem(storageKey, next);
      setFallbackView(getView() === next ? null : next);
      window.dispatchEvent(new Event(preferenceChangeEvent));
    } catch {
      // Saving a display preference must not prevent switching views.
      setFallbackView(next);
    }
  }

  return (
    <div className={styles.view}>
      <div className={styles.toolbar}>
        <p aria-live="polite">{count}</p>
        <div
          className={styles.toggle}
          role="group"
          aria-label="نوع نمایش فهرست"
        >
          <button
            type="button"
            className={cn(
              styles.toggleButton,
              view === "table" && styles.active,
            )}
            aria-label="نمای جدولی"
            aria-pressed={view === "table"}
            aria-controls={regionId}
            onClick={() => selectView("table")}
          >
            <Table2 size={17} aria-hidden="true" />
            جدولی
          </button>
          <button
            type="button"
            className={cn(
              styles.toggleButton,
              view === "cards" && styles.active,
            )}
            aria-label="نمای کارتی"
            aria-pressed={view === "cards"}
            aria-controls={regionId}
            onClick={() => selectView("cards")}
          >
            <LayoutGrid size={17} aria-hidden="true" />
            کارتی
          </button>
        </div>
      </div>
      <div id={regionId}>
        {hasItems ? (view === "cards" ? cards : table) : empty}
      </div>
    </div>
  );
}
