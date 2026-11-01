"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function AdminOrderRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/admin" && pathname !== "/admin/orders") return;
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [pathname, router]);
  return null;
}
