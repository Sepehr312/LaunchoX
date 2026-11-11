"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function LaunchoAssistant() {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  useEffect(() => {
    const updateVisibility = () => {
      // The loader owns a body-level host with inline !important styles.
      document
        .getElementById("launcho-widget")
        ?.style.setProperty("display", isAdmin ? "none" : "block", "important");
    };
    updateVisibility();
    // Also cover a pending loader completing after navigation to the admin panel.
    const observer = new MutationObserver(updateVisibility);
    observer.observe(document.body, { childList: true });
    return () => observer.disconnect();
  }, [isAdmin]);

  if (isAdmin) return null;

  return (
    <Script
      id="launcho-assistant-widget"
      src="https://ag.launchox.ir/widget/loader.js"
      strategy="afterInteractive"
      defer
      data-theme="auto"
      data-position="right"
    />
  );
}
