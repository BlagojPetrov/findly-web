import { beforeEach, describe, expect, it, vi } from "vitest";
import { getItem } from "./items";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("server-only", () => ({}));
// from("items").select(columns).eq("id", id).maybeSingle() → query(...)'s result.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: string) => ({
          maybeSingle: async () => query(table, columns, column, value),
        }),
      }),
    }),
  }),
}));

const itemId = "118fd7ac-1de9-42ce-9d93-04638a72abc8";
const owner = {
  id: "00000000-0000-4000-8000-0000000000a1",
  display_name: "Ана",
  avatar_path: null,
  created_at: "2026-09-01T10:00:00+00:00",
};

function itemRow() {
  return {
    id: itemId,
    user_id: owner.id,
    type: "lost",
    status: "active",
    title: "Црн паричник",
    description: "Паричник со лична карта.",
    occurred_on: "2026-10-01",
    location_name: "Скопје",
    lat: 41.9981,
    lng: 21.4254,
    resolved_at: null,
    created_at: "2026-10-01T13:11:47+00:00",
    updated_at: "2026-10-01T13:11:47+00:00",
    category: {
      id: 3,
      slug: "wallet",
      name_mk: "Паричник",
      name_en: "Wallet",
      icon: "wallet",
    },
    owner,
    images: [
      { id: "b", storage_path: `${owner.id}/b.webp`, position: 1 },
      { id: "a", storage_path: `${owner.id}/a.webp`, position: 0 },
    ],
  };
}

beforeEach(() => {
  query.mockReset();
});

describe("getItem", () => {
  it("loads the item with its owner through the items → profiles foreign key", async () => {
    query.mockResolvedValue({ data: itemRow(), error: null });
    const item = await getItem(itemId);

    expect(query).toHaveBeenCalledTimes(1);
    const [table, columns, column, value] = query.mock.calls[0];
    expect([table, column, value]).toEqual(["items", "id", itemId]);
    // favorites also links items and profiles: a plain "profiles" embed is
    // ambiguous for PostgREST (PGRST201), so the owner names its foreign key.
    expect(columns).toMatch(/owner:profiles!items_user_id_fkey\s*\(/);
    expect(columns).not.toMatch(/:profiles\s*\(/);

    expect(item?.owner).toEqual(owner);
    expect(item?.images.map((image) => image.id)).toEqual(["a", "b"]);
  });

  it("returns null when the item does not exist or is not visible", async () => {
    query.mockResolvedValue({ data: null, error: null });
    expect(await getItem(itemId)).toBeNull();
  });

  it("returns null for an id that is not a UUID without querying", async () => {
    expect(await getItem("not-a-uuid")).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it("throws with the database error", async () => {
    query.mockResolvedValue({
      data: null,
      error: {
        message:
          "Could not embed because more than one relationship was found for 'items' and 'profiles'",
      },
    });
    await expect(getItem(itemId)).rejects.toThrow(
      `Failed to load item ${itemId}: Could not embed`,
    );
  });
});
