"use client";

import { FrosticHeroSlider } from "@/components/preview/frostic/FrosticHeroSlider";
import { usePreviewTheme } from "@/components/preview/frostic/use-preview-theme";
import themeStyles from "@/components/preview/frostic/frostic-theme.module.css";

export function StoreHero() {
  const { theme } = usePreviewTheme();

  return (
    <div className={themeStyles.theme} data-theme={theme}>
      <FrosticHeroSlider mobileControls />
    </div>
  );
}
