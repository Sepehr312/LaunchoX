"use client";

import { useEffect } from "react";
import { usePreviewTheme } from "@/components/preview/frostic/use-preview-theme";

export function SiteTheme() {
  const { theme } = usePreviewTheme();

  useEffect(() => {
    if (theme !== "system") document.documentElement.dataset.theme = theme;
  }, [theme]);

  return null;
}
