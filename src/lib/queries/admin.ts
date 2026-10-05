import "server-only";
import {
  groupReports,
  type QueueGroup,
  type QueueItem,
} from "@/lib/moderation";
import { createClient } from "@/lib/supabase/server";
import type { UserListFilters } from "@/lib/validation/admin";
import type { Database } from "@/types/database";

export type AdminStats =
  Database["public"]["Functions"]["admin_stats"]["Returns"][number];

// Site-wide numbers for the admin dashboard (§18), from one RPC. The
// function raises 42501 for anyone who is not an admin.
export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_stats").single();
  if (error) {
    throw new Error(`Failed to load the admin stats: ${error.message}`);
  }
  return data;
}

// The open flags the queue loads at most, oldest first. The queue pages
// through the items they are about (a few hundred open flags are already far
// beyond what moderators handle at once; newer ones show once older ones are
// closed).
export const REPORT_QUEUE_MAX_REPORTS = 500;
// Items (with their flags) per page of the queue.
export const REPORT_QUEUE_PAGE_SIZE = 10;
// Hidden reports per page.
export const HIDDEN_ITEMS_PAGE_SIZE = 20;

// reports has two foreign keys to profiles (reporter, resolver), and items
// one more path to profiles through favorites/reports: every embed names
// its foreign key (F-34).
const queueColumns = `id, reason, details, created_at,
  reporter:profiles!reports_reporter_id_fkey (id, display_name),
  item:items!inner (id, title, type, status,
    owner:profiles!items_user_id_fkey (id, display_name))` as const;

// One page of the moderation queue (/admin/reports): items with open flags,
// the one whose oldest flag waits longest first, with the number of items
// and of open flags loaded. Admins see every report and hidden items (RLS).
export async function getReportQueue(page: number): Promise<{
  groups: QueueGroup[];
  total: number;
  reports: number;
  truncated: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select(queueColumns)
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(REPORT_QUEUE_MAX_REPORTS);
  if (error) {
    throw new Error(`Failed to load the report queue: ${error.message}`);
  }
  const groups = groupReports(data);
  const from = (page - 1) * REPORT_QUEUE_PAGE_SIZE;
  return {
    groups: groups.slice(from, from + REPORT_QUEUE_PAGE_SIZE),
    total: groups.length,
    reports: data.length,
    truncated: data.length === REPORT_QUEUE_MAX_REPORTS,
  };
}

export type HiddenItem = QueueItem & {
  // Set when the report was resolved before it was hidden (restoring
  // returns it to resolved).
  resolvedAt: string | null;
  updatedAt: string;
};

const hiddenColumns = `id, title, type, status, resolved_at, updated_at,
  owner:profiles!items_user_id_fkey (id, display_name)` as const;

// One page of hidden reports, the most recently changed first, with the
// total.
export async function getHiddenItems(
  page: number,
): Promise<{ items: HiddenItem[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * HIDDEN_ITEMS_PAGE_SIZE;
  const { data, error, count } = await supabase
    .from("items")
    .select(hiddenColumns, { count: "exact" })
    .eq("status", "hidden")
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + HIDDEN_ITEMS_PAGE_SIZE - 1);
  // A page past the end: PostgREST answers 416 instead of an empty page. The
  // caller needs the total to send the admin to the last page.
  if (error?.code === "PGRST103") {
    const { count: total, error: countError } = await supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("status", "hidden");
    if (countError) {
      throw new Error(`Failed to count hidden items: ${countError.message}`);
    }
    return { items: [], total: total ?? 0 };
  }
  if (error) throw new Error(`Failed to load hidden items: ${error.message}`);
  return {
    items: data.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      status: item.status,
      resolvedAt: item.resolved_at,
      updatedAt: item.updated_at,
      owner: { id: item.owner.id, displayName: item.owner.display_name },
    })),
    total: count ?? 0,
  };
}

// Users per page on /admin/users.
export const USERS_PAGE_SIZE = 20;

export type AdminUser = {
  id: string;
  displayName: string;
  avatarPath: string | null;
  email: string | null;
  role: "user" | "admin";
  isBanned: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  itemCount: number;
  openReportCount: number;
};

// One page of users for the admin (newest accounts first), searched by name
// or email, optionally only banned ones, with the number of matching users.
// admin_list_users() raises 42501 for non-admins. A page past the end has no
// rows (and so no total): the total then comes from a one-row first page.
export async function getUserPage(
  filters: UserListFilters,
  page: number,
): Promise<{ users: AdminUser[]; total: number }> {
  const supabase = await createClient();
  const list = (pageSize: number, offset: number) =>
    supabase.rpc("admin_list_users", {
      search: filters.q || undefined,
      banned_only: filters.bannedOnly,
      page_size: pageSize,
      page_offset: offset,
    });
  const { data, error } = await list(
    USERS_PAGE_SIZE,
    (page - 1) * USERS_PAGE_SIZE,
  );
  if (error) throw new Error(`Failed to load users: ${error.message}`);
  if (data.length === 0 && page > 1) {
    const { data: first, error: countError } = await list(1, 0);
    if (countError) {
      throw new Error(`Failed to count users: ${countError.message}`);
    }
    return { users: [], total: first[0]?.total_count ?? 0 };
  }
  return {
    // Generated types claim non-null results; avatar, email and the last
    // sign-in can be null.
    users: data.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      avatarPath: row.avatar_path ?? null,
      email: row.email ?? null,
      role: row.role,
      isBanned: row.is_banned,
      createdAt: row.created_at,
      lastSignInAt: row.last_sign_in_at ?? null,
      itemCount: row.item_count,
      openReportCount: row.open_report_count,
    })),
    total: data[0]?.total_count ?? 0,
  };
}

export type AdminCategory = {
  id: number;
  slug: string;
  nameMk: string;
  nameEn: string;
  icon: string;
  // Reports in the category, hidden ones included (a category in use
  // cannot be deleted).
  itemCount: number;
};

// Every category in display order with the number of reports in it.
export async function getAdminCategories(): Promise<AdminCategory[]> {
  const supabase = await createClient();
  const [categories, counts] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, name_mk, name_en, icon")
      .order("sort_order")
      .order("id"),
    supabase.rpc("admin_category_item_counts"),
  ]);
  if (categories.error) {
    throw new Error(`Failed to load categories: ${categories.error.message}`);
  }
  if (counts.error) {
    throw new Error(`Failed to count category items: ${counts.error.message}`);
  }
  const countById = new Map(
    counts.data.map((row) => [row.category_id, row.item_count]),
  );
  return categories.data.map((category) => ({
    id: category.id,
    slug: category.slug,
    nameMk: category.name_mk,
    nameEn: category.name_en,
    icon: category.icon,
    itemCount: countById.get(category.id) ?? 0,
  }));
}
