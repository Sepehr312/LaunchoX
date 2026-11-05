"use client";

import { FrosticHeader } from "@/components/store/frostic/FrosticHeader";
import type { CategoryDTO } from "@/types/dto";

export function StoreHeader({
  cartCount,
  authenticated = false,
  showServices = true,
  showAbout = true,
}: {
  categories: CategoryDTO[];
  cartCount: number;
  authenticated?: boolean;
  showServices?: boolean;
  showAbout?: boolean;
}) {
  return (
    <FrosticHeader
      cartCount={cartCount}
      authenticated={authenticated}
      showServices={showServices}
      showAbout={showAbout}
    />
  );
}
