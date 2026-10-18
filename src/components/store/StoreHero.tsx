"use client";

import { FrosticHeroSlider } from "@/components/preview/frostic/FrosticHeroSlider";
import { ArcticBenefitsBar } from "@/components/preview/frostic/ArcticBenefitsBar";
import { ArcticProductCategories } from "@/components/preview/frostic/ArcticProductCategories";
import { usePreviewTheme } from "@/components/preview/frostic/use-preview-theme";
import themeStyles from "@/components/preview/frostic/frostic-theme.module.css";
import type { CategoryDTO } from "@/types/dto";

export function StoreHero({ categories }: { categories: CategoryDTO[] }) {
  const { theme } = usePreviewTheme();

  return (
    <div className={themeStyles.theme} data-theme={theme}>
      <FrosticHeroSlider autoPlay mobileControls />
      <ArcticBenefitsBar />
      <ArcticProductCategories categories={categories} />
    </div>
  );
}
