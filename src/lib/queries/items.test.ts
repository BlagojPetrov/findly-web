import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SEARCH_FILTERS } from "@/lib/validation/search";
import { getItem, searchItemLocations, searchItems } from "./items";

const { query, rpc } = vi.hoisted(() => ({ query: vi.fn(), rpc: vi.fn() }));

vi.mock("server-only", () => ({}));
// from("items").select(columns).eq("id", id).maybeSingle() → query(...)'s result;
// rpc(name, args) → rpc(...)'s result.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async (name: string, args: object) => rpc(name, args),
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
  rpc.mockReset();
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

describe("searchItems", () => {
  function searchRow(overrides: object = {}) {
    return {
      id: itemId,
      type: "lost",
      status: "active",
      title: "Црн паричник",
      occurred_on: "2026-10-01",
      location_name: null,
      created_at: "2026-10-01T13:11:47+00:00",
      category_id: 3,
      category_slug: "wallet",
      category_name_mk: "Паричник",
      category_name_en: "Wallet",
      category_icon: "wallet",
      cover_path: null,
      distance_m: null,
      is_favorite: false,
      total_count: 1,
      ...overrides,
    };
  }

  it("maps is_favorite of the signed-in user to isFavorite", async () => {
    rpc.mockResolvedValue({
      data: [
        searchRow({ is_favorite: true }),
        searchRow({ id: "other", is_favorite: false }),
      ],
      error: null,
    });
    const { items, total } = await searchItems(DEFAULT_SEARCH_FILTERS);
    expect(rpc.mock.calls[0][0]).toBe("search_items");
    expect(items.map((item) => item.isFavorite)).toEqual([true, false]);
    expect(items[0]).toMatchObject({
      id: itemId,
      location_name: null,
      coverPath: null,
      distance: null,
      category: { id: 3, slug: "wallet" },
    });
    expect(total).toBe(1);
  });
});

describe("searchItemLocations", () => {
  const filters = {
    ...DEFAULT_SEARCH_FILTERS,
    q: "паричник",
    type: "lost" as const,
    categories: ["wallet", "keys"],
    status: "all" as const,
    from: "2026-09-01",
    to: "2026-10-01",
    near: { lat: 41.9981, lng: 21.4254 },
    radius: 5 as const,
    sort: "relevance" as const,
    view: "map" as const,
  };

  function locationRow(overrides: object = {}) {
    return {
      id: itemId,
      type: "lost",
      status: "resolved",
      title: "Црн паричник",
      occurred_on: "2026-10-01",
      location_name: null,
      lat: 41.99,
      lng: 21.42,
      category_slug: "wallet",
      category_name_mk: "Паричник",
      category_name_en: "Wallet",
      category_icon: "wallet",
      cover_path: null,
      total_count: 301,
      ...overrides,
    };
  }

  it("passes the same filter arguments as the list, without paging", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await searchItems(filters);
    await searchItemLocations(filters);
    const [[listName, listArgs], [mapName, mapArgs]] = rpc.mock.calls;
    expect(listName).toBe("search_items");
    expect(mapName).toBe("search_item_locations");
    const { page, page_size, ...listFilters } = listArgs;
    expect(page).toBe(1);
    expect(page_size).toBe(20);
    expect(mapArgs).toEqual(listFilters);
    expect(mapArgs).toEqual({
      q: "паричник",
      item_type: "lost",
      category_slugs: ["wallet", "keys"],
      item_status: null,
      date_from: "2026-09-01",
      date_to: "2026-10-01",
      near_lat: 41.9981,
      near_lng: 21.4254,
      radius_km: 5,
      sort: "relevance",
    });
  });

  it("maps the rows and the total", async () => {
    rpc.mockResolvedValue({
      data: [locationRow(), locationRow({ id: "b", cover_path: "u/i/c.webp" })],
      error: null,
    });
    const { items, total } = await searchItemLocations(filters);
    expect(items[0]).toEqual({
      id: itemId,
      type: "lost",
      status: "resolved",
      title: "Црн паричник",
      occurredOn: "2026-10-01",
      locationName: null,
      lat: 41.99,
      lng: 21.42,
      category: {
        slug: "wallet",
        icon: "wallet",
        name_mk: "Паричник",
        name_en: "Wallet",
      },
      coverPath: null,
    });
    expect(items[1].coverPath).toBe("u/i/c.webp");
    expect(total).toBe(301);
  });

  it("has total 0 without rows", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    expect(await searchItemLocations(DEFAULT_SEARCH_FILTERS)).toEqual({
      items: [],
      total: 0,
    });
  });

  it("throws on errors", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(searchItemLocations(DEFAULT_SEARCH_FILTERS)).rejects.toThrow(
      "Failed to load item locations: boom",
    );
  });
});
