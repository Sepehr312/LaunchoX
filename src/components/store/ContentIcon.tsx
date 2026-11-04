import {
  Store,
  BookOpen,
  ShieldCheck,
  Layers,
  Info,
  Headphones,
  Compass,
  ShoppingCart,
  Truck,
  Leaf,
  Scale,
  CheckCircle,
  Ruler,
  Volume2,
} from "lucide-react";
import type { ContentIconName } from "@/validations/about-sections";

const icons = {
  store: Store,
  book: BookOpen,
  shield: ShieldCheck,
  layers: Layers,
  info: Info,
  headphones: Headphones,
  compass: Compass,
  cart: ShoppingCart,
  truck: Truck,
  leaf: Leaf,
  compare: Scale,
  check: CheckCircle,
  ruler: Ruler,
  volume: Volume2,
};
export function ContentIcon({
  name,
  size = 28,
}: {
  name: ContentIconName;
  size?: number;
}) {
  const Icon = icons[name];
  return <Icon size={size} aria-hidden="true" />;
}
