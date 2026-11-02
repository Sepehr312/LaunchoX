"use client";

import {
  FrosticHeroSlider,
  type FrosticHeroSlide,
} from "@/components/store/frostic/FrosticHeroSlider";
import { ArcticBenefitsBar } from "@/components/store/frostic/ArcticBenefitsBar";
import { ArcticProductCategories } from "@/components/store/frostic/ArcticProductCategories";
import themeStyles from "@/components/store/frostic/frostic-theme.module.css";
import type { CategoryDTO } from "@/types/dto";

export function StoreHero({
  categories,
  slides,
}: {
  categories: CategoryDTO[];
  slides?: readonly FrosticHeroSlide[];
}) {
  return (
    <div className={themeStyles.theme}>
      <FrosticHeroSlider slides={slides} autoPlay mobileControls />
      <ArcticBenefitsBar />
      <ArcticProductCategories categories={categories} />
    </div>
  );
}
