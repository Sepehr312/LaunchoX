"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import {
  mergeFavoritesAction,
  setFavoriteAction,
  readFavoritesAction,
} from "@/actions/favorite.actions";
const prefix = "launchox-product-like:";
function guestIds() {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix) && localStorage.getItem(k) === "1")
      .map((k) => k.slice(prefix.length))
      .filter((id) => /^[a-f0-9]{24}$/i.test(id));
  } catch {
    return [];
  }
}
const Context = createContext<{
  ids: string[];
  pending: boolean;
  toggle: (id: string) => Promise<void>;
}>({ ids: [], pending: false, toggle: async () => {} });
export const useFavorites = () => useContext(Context);
export function FavoritesProvider({
  userId,
  initial,
  children,
}: {
  userId?: string;
  initial: string[];
  children: ReactNode;
}) {
  const [ids, setIds] = useState(initial),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const busy = useRef(false);
  useEffect(() => {
    let alive = true;
    let syncing = false;
    const sync = async () => {
      if (busy.current || syncing) return;
      syncing = true;
      busy.current = true;
      try {
        const guest = guestIds();
        let result = guest;
        if (userId) {
          result = await readFavoritesAction();
          for (let i = 0; i < guest.length; i += 200) {
            const chunk = guest.slice(i, i + 200);
            result = await mergeFavoritesAction(chunk);
            try {
              for (const id of chunk) localStorage.removeItem(prefix + id);
            } catch {
              /* Retain server state when storage is unavailable. */
            }
          }
        }
        if (alive) {
          setIds(result);
          setError("");
        }
      } catch {
        if (alive)
          setError(
            "همگام‌سازی علاقه‌مندی‌ها انجام نشد؛ با بازگشت به صفحه دوباره تلاش می‌شود.",
          );
      } finally {
        syncing = false;
        busy.current = false;
      }
    };
    void sync();
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => {
      alive = false;
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, [userId]);
  async function toggle(id: string) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const liked = !ids.includes(id);
      if (userId) setIds(await setFavoriteAction({ id, liked }));
      else {
        try {
          if (liked) localStorage.setItem(prefix + id, "1");
          else localStorage.removeItem(prefix + id);
        } catch {
          /* Keep the choice in memory if storage is blocked. */
        }
        setIds(liked ? [...ids, id] : ids.filter((v) => v !== id));
      }
    } catch {
      setError("ذخیرهٔ علاقه‌مندی انجام نشد؛ دوباره تلاش کنید.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <Context.Provider value={{ ids, pending, toggle }}>
      {error && (
        <p role="alert" className="border p-3 text-center">
          {error}
        </p>
      )}
      {children}
    </Context.Provider>
  );
}
