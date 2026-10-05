// Icon names a category can use (categories.icon). CategoryIcon maps each to
// a lucide component; the admin category form offers exactly these.
export const CATEGORY_ICONS = [
  "smartphone",
  "laptop",
  "tablet",
  "headphones",
  "camera",
  "file-text",
  "id-card",
  "credit-card",
  "wallet",
  "key-round",
  "watch",
  "gem",
  "glasses",
  "shirt",
  "backpack",
  "briefcase",
  "umbrella",
  "book-open",
  "gamepad-2",
  "baby",
  "bike",
  "car",
  "paw-print",
  "package",
] as const;

export type CategoryIconName = (typeof CATEGORY_ICONS)[number];
