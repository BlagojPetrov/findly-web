import { z } from "zod";
import { ITEM_TYPES } from "./items";
import type { RawSearchParams } from "./search";

// Filters of the /map page, kept in the URL: ?type=lost|found. An invalid
// value falls back to "all types"; the page redirects to the canonical URL.

export type MapFilters = { type: (typeof ITEM_TYPES)[number] | null };

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);

const mapParamsSchema = z.object({
  type: z.preprocess(first, z.enum(ITEM_TYPES).nullable()).catch(null),
});

export function parseMapParams(params: RawSearchParams): MapFilters {
  return mapParamsSchema.parse(params);
}

// The URL query of the filters, without defaults ("/map" = every type).
export function mapQuery({ type }: MapFilters): Record<string, string> {
  return type ? { type } : {};
}
