import {
  Baby,
  Backpack,
  Bike,
  BookOpen,
  Briefcase,
  Camera,
  Car,
  CreditCard,
  FileText,
  Gamepad2,
  Gem,
  Glasses,
  Headphones,
  IdCard,
  KeyRound,
  Laptop,
  type LucideIcon,
  type LucideProps,
  Package,
  PawPrint,
  Shirt,
  Smartphone,
  Tablet,
  Umbrella,
  Wallet,
  Watch,
} from "lucide-react";
import type { CategoryIconName } from "@/lib/category-icons";

// Maps categories.icon values from the database to icon components.
// Explicit map instead of a dynamic import keeps the bundle small. Admins
// pick from CATEGORY_ICONS (@/lib/category-icons); unknown names fall back
// to the package icon.
const icons: Record<CategoryIconName, LucideIcon> = {
  smartphone: Smartphone,
  laptop: Laptop,
  tablet: Tablet,
  headphones: Headphones,
  camera: Camera,
  "file-text": FileText,
  "id-card": IdCard,
  "credit-card": CreditCard,
  wallet: Wallet,
  "key-round": KeyRound,
  watch: Watch,
  gem: Gem,
  glasses: Glasses,
  shirt: Shirt,
  backpack: Backpack,
  briefcase: Briefcase,
  umbrella: Umbrella,
  "book-open": BookOpen,
  "gamepad-2": Gamepad2,
  baby: Baby,
  bike: Bike,
  car: Car,
  "paw-print": PawPrint,
  package: Package,
};

export function CategoryIcon({
  name,
  ...props
}: { name: string } & LucideProps) {
  const Icon = icons[name as CategoryIconName] ?? Package;
  return <Icon aria-hidden {...props} />;
}
