import type { ComponentProps } from "react";
import { FrosticHeader as StoreFrosticHeader } from "@/components/store/frostic/FrosticHeader";

// Keep historical test imports compatible while production remains light-only.
export function FrosticHeader(
  props: ComponentProps<typeof StoreFrosticHeader> & { theme?: "light" },
) {
  return <StoreFrosticHeader {...props} />;
}
export type { FrosticNavItem } from "@/components/store/frostic/FrosticHeader";
