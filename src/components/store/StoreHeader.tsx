"use client";

import { FrosticHeader } from "@/components/preview/frostic/FrosticHeader";
import { usePreviewTheme } from "@/components/preview/frostic/use-preview-theme";
import type { CategoryDTO } from "@/types/dto";

export function StoreHeader({
  cartCount,
  authenticated = false,
}: {
  categories: CategoryDTO[];
  cartCount: number;
  authenticated?: boolean;
}) {
  const { theme } = usePreviewTheme();

  return (
    <FrosticHeader
      cartCount={cartCount}
      authenticated={authenticated}
      theme={theme}
    />
  );
}
