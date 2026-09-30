import "server-only";
import { z } from "zod";
import {
  groupMatches,
  type MatchGroups,
  type MatchRow,
  toMatchViews,
} from "@/lib/matches";
import { coverPath, type ItemSummary } from "@/lib/queries/items";
import { createClient } from "@/lib/supabase/server";

// An item of a match: what an item card shows, plus the owner's id (to tell
// the viewer's report from the other one). No coordinates: the breakdown
// already has the distance.
export type MatchItem = ItemSummary & { user_id: string };

const matchItemColumns = `
  id, user_id, type, status, title, occurred_on, location_name, created_at,
  category:categories (id, slug, name_mk, name_en, icon),
  images:item_images (storage_path, position)
`;

// Both items through their own foreign keys. RLS applies to the matches
// (only those of the viewer's reports) and to the embedded items (someone
// else's hidden item comes back as null).
const matchColumns = `
  id, status, score, breakdown, created_at, updated_at,
  lost:items!matches_lost_item_id_fkey (${matchItemColumns}),
  found:items!matches_found_item_id_fkey (${matchItemColumns})
`;

type RawItem = Omit<MatchItem, "coverPath"> & {
  images: { storage_path: string; position: number }[];
};

function toMatchItem(item: RawItem | null): MatchItem | null {
  if (!item) return null;
  const { images, ...rest } = item;
  return { ...rest, coverPath: coverPath(images) };
}

function toRows(
  data: (Omit<MatchRow<MatchItem>, "lost" | "found"> & {
    lost: RawItem | null;
    found: RawItem | null;
  })[],
): MatchRow<MatchItem>[] {
  return data.map((row) => ({
    ...row,
    lost: toMatchItem(row.lost),
    found: toMatchItem(row.found),
  }));
}

export type ItemMatches = MatchGroups<MatchItem>;

// Matches of one of the viewer's reports (item page, owner only): the best
// suggested ones, confirmed ones and dismissed ones (which can be restored).
export async function getItemMatches(
  itemId: string,
  viewerId: string,
): Promise<ItemMatches> {
  if (!z.uuid().safeParse(itemId).success) {
    return { suggested: [], confirmed: [], dismissed: [] };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(matchColumns)
    .or(`lost_item_id.eq.${itemId},found_item_id.eq.${itemId}`)
    .order("score", { ascending: false });
  if (error) throw new Error(`Failed to load matches: ${error.message}`);
  const views = toMatchViews(toRows(data), viewerId).filter(
    (view) => view.own.id === itemId,
  );
  return groupMatches(views);
}

// Suggested and confirmed matches of all the viewer's reports (dashboard),
// at most 10 suggested ones per report.
export async function getUserMatches(
  viewerId: string,
): Promise<Omit<ItemMatches, "dismissed">> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(matchColumns)
    .in("status", ["suggested", "confirmed"])
    .order("score", { ascending: false });
  if (error) throw new Error(`Failed to load matches: ${error.message}`);
  const { suggested, confirmed } = groupMatches(
    toMatchViews(toRows(data), viewerId),
  );
  return { suggested, confirmed };
}
