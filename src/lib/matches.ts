import { z } from "zod";
import type { Enums } from "@/types/database";

// Client-safe helpers for matches (§14): reading the stored breakdown,
// turning it into reasons the UI can translate, and choosing which matches
// the signed-in user sees. The queries are in @/lib/queries/matches.

export type MatchStatus = Enums<"match_status">;
export const MATCH_STATUSES = ["suggested", "dismissed", "confirmed"] as const;

// Suggested matches shown per own report, as compute_matches() keeps them
// (the other side of a pair can collect more rows, P6.S3).
export const MATCHES_PER_ITEM = 10;

// The parts of matches.breakdown the UI uses. The column is jsonb, so every
// field is checked; a missing or malformed one just gives no reason.
const breakdownSchema = z.object({
  category: z.number().min(0).max(1).optional().catch(undefined),
  distance_km: z.number().nonnegative().optional().catch(undefined),
  days_between: z.number().int().nonnegative().optional().catch(undefined),
  text: z.number().min(0).max(1).optional().catch(undefined),
  shared_words: z.array(z.string()).optional().catch(undefined),
});

export type MatchBreakdown = z.infer<typeof breakdownSchema>;

export function parseBreakdown(value: unknown): MatchBreakdown {
  const parsed = breakdownSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

// Shared words listed in an explanation; the rest are counted.
const SHOWN_WORDS = 5;
// Below this text score (and without shared words) the descriptions are
// called different.
const SIMILAR_TEXT = 0.3;

export type MatchReason =
  | { kind: "category"; same: boolean }
  | { kind: "distance"; meters: number }
  | { kind: "date"; days: number }
  | { kind: "words"; words: string[]; more: number }
  | { kind: "text"; similar: boolean };

// Why two reports were matched, in the order of the score's components:
// category, distance, date, then the shared words (or, without any, whether
// the descriptions are similar).
export function matchReasons(breakdown: MatchBreakdown): MatchReason[] {
  const reasons: MatchReason[] = [];
  if (breakdown.category !== undefined) {
    reasons.push({ kind: "category", same: breakdown.category >= 1 });
  }
  if (breakdown.distance_km !== undefined) {
    reasons.push({ kind: "distance", meters: breakdown.distance_km * 1000 });
  }
  if (breakdown.days_between !== undefined) {
    reasons.push({ kind: "date", days: breakdown.days_between });
  }
  const words = breakdown.shared_words ?? [];
  if (words.length > 0) {
    reasons.push({
      kind: "words",
      words: words.slice(0, SHOWN_WORDS),
      more: Math.max(0, words.length - SHOWN_WORDS),
    });
  } else if (breakdown.text !== undefined) {
    reasons.push({ kind: "text", similar: breakdown.text >= SIMILAR_TEXT });
  }
  return reasons;
}

export type MatchStrength = "strong" | "good" | "possible";

// A word for the score (stored matches are ≥ 0.55).
export function matchStrength(score: number): MatchStrength {
  if (score >= 0.8) return "strong";
  if (score >= 0.7) return "good";
  return "possible";
}

// What the matching needs to know about each item of a pair.
type PairItem = {
  id: string;
  user_id: string;
  status: Enums<"item_status">;
};

// A match row with both items as the viewer can read them (RLS returns null
// for an item the viewer may not see, e.g. someone else's hidden item).
export type MatchRow<T extends PairItem> = {
  id: string;
  status: MatchStatus;
  score: number;
  breakdown: unknown;
  created_at: string;
  updated_at: string;
  lost: T | null;
  found: T | null;
};

// A match from the viewer's side: `own` is the viewer's report, `other` the
// report of the other person.
export type MatchView<T extends PairItem> = {
  id: string;
  status: MatchStatus;
  score: number;
  breakdown: MatchBreakdown;
  updatedAt: string;
  own: T;
  other: T;
};

// The matches the viewer may see, from their side. Rows that do not involve
// one of the viewer's reports are dropped (RLS already returns only those;
// this keeps the UI safe if a query is ever widened). Suggested and
// dismissed matches need two active reports; a confirmed one stays while
// neither report is hidden, so it is still there after the viewer marks
// their report as resolved.
export function toMatchViews<T extends PairItem>(
  rows: MatchRow<T>[],
  viewerId: string,
): MatchView<T>[] {
  const views: MatchView<T>[] = [];
  for (const row of rows) {
    const { lost, found } = row;
    if (!lost || !found) continue;
    let own: T;
    let other: T;
    if (lost.user_id === viewerId && found.user_id !== viewerId) {
      [own, other] = [lost, found];
    } else if (found.user_id === viewerId && lost.user_id !== viewerId) {
      [own, other] = [found, lost];
    } else {
      continue;
    }
    const visible =
      row.status === "confirmed"
        ? own.status !== "hidden" && other.status !== "hidden"
        : own.status === "active" && other.status === "active";
    if (!visible) continue;
    views.push({
      id: row.id,
      status: row.status,
      score: row.score,
      breakdown: parseBreakdown(row.breakdown),
      updatedAt: row.updated_at,
      own,
      other,
    });
  }
  return views;
}

export type MatchGroups<T extends PairItem> = {
  suggested: MatchView<T>[];
  confirmed: MatchView<T>[];
  dismissed: MatchView<T>[];
};

// Splits matches by status. Suggested ones are best first, at most
// MATCHES_PER_ITEM per own report; confirmed and dismissed ones are the
// most recently changed first.
export function groupMatches<T extends PairItem>(
  views: MatchView<T>[],
): MatchGroups<T> {
  const byScore = (a: MatchView<T>, b: MatchView<T>) =>
    b.score - a.score || a.id.localeCompare(b.id);
  const byUpdate = (a: MatchView<T>, b: MatchView<T>) =>
    b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id);

  const perItem = new Map<string, number>();
  const suggested = views
    .filter((view) => view.status === "suggested")
    .sort(byScore)
    .filter((view) => {
      const count = perItem.get(view.own.id) ?? 0;
      perItem.set(view.own.id, count + 1);
      return count < MATCHES_PER_ITEM;
    });

  return {
    suggested,
    confirmed: views.filter((v) => v.status === "confirmed").sort(byUpdate),
    dismissed: views.filter((v) => v.status === "dismissed").sort(byUpdate),
  };
}
