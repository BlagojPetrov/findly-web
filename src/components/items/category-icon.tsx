import {
  FileText,
  KeyRound,
  type LucideProps,
  Package,
  PawPrint,
  Shirt,
  Smartphone,
  Wallet,
  Watch,
} from "lucide-react";

// Maps categories.icon values from the database to icon components.
// Explicit map instead of a dynamic import keeps the bundle small.
const icons = {
  smartphone: Smartphone,
  "file-text": FileText,
  wallet: Wallet,
  "key-round": KeyRound,
  watch: Watch,
  shirt: Shirt,
  "paw-print": PawPrint,
  package: Package,
} as const;

export function CategoryIcon({
  name,
  ...props
}: { name: string } & LucideProps) {
  const Icon = icons[name as keyof typeof icons] ?? Package;
  return <Icon aria-hidden {...props} />;
}
