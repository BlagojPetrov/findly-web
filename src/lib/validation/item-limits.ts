// Limits shared with the forms (maxLength, image count), without Zod, so
// browser code can use them without the item schema (P11.S5). The database
// has the same limits as check constraints (migration *_items.sql).
// `./items` re-exports them.
export const ITEM_LIMITS = {
  titleMin: 3,
  titleMax: 100,
  descriptionMin: 10,
  descriptionMax: 2000,
  locationNameMax: 200,
  images: 5,
} as const;
