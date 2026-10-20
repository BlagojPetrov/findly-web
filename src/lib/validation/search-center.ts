// The feed's center and radius values, without Zod: client components import
// them from here, so the browser bundle does not pull in the schemas of
// `./search` (P11.S5). `./search` re-exports them.

// Radius choices in km (search_items() accepts up to 50).
export const SEARCH_RADII = [1, 2, 5, 10, 25, 50] as const;
// Decimals of the center in the URL (~11 m): enough for a 1 km radius, and a
// device location is not put into links more precisely than needed.
export const CENTER_DECIMALS = 4;

export type SearchRadius = (typeof SEARCH_RADII)[number];

export const roundCoordinate = (value: number) =>
  Number(value.toFixed(CENTER_DECIMALS));

// A center coordinate as written to the URL ("41.9981", "21.4").
export const centerParam = (value: number) => String(roundCoordinate(value));
