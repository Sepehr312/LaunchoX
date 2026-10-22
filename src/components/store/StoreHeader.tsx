"use client";

import { FrosticHeader } from "@/components/store/frostic/FrosticHeader";
import type { CategoryDTO } from "@/types/dto";

export function StoreHeader({
  cartCount,
  authenticated = false,
}: {
  categories: CategoryDTO[];
  cartCount: number;
  authenticated?: boolean;
}) {
  return <FrosticHeader cartCount={cartCount} authenticated={authenticated} />;
}
