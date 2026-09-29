import { describe, expect, it, vi } from "vitest";
import {
  clampBounds,
  fetchMapItems,
  groupByPoint,
  type MapItem,
} from "./map-items";

const item = (id: string, lat: number, lng: number, type = "lost") =>
  ({
    id,
    type,
    title: id,
    occurredOn: "2026-09-01",
    locationName: null,
    lat,
    lng,
    category: { slug: "wallet", icon: "wallet", name_mk: "", name_en: "" },
    coverPath: null,
  }) as MapItem;

describe("clampBounds", () => {
  it("keeps a normal area", () => {
    const area = { south: 41, west: 21, north: 42, east: 22.5 };
    expect(clampBounds(area)).toEqual(area);
  });

  it("clamps beyond the poles", () => {
    expect(clampBounds({ south: -95, west: 10, north: 100, east: 30 })).toEqual(
      { south: -90, west: 10, north: 90, east: 30 },
    );
  });

  it.each([
    [{ south: -60, west: -200, north: 70, east: 100 }],
    [{ south: -60, west: 170, north: 70, east: 190 }],
    [{ south: -60, west: -250, north: 70, east: 300 }],
  ])("takes every longitude across the antimeridian (%j)", (bounds) => {
    expect(clampBounds(bounds)).toEqual({
      south: -60,
      west: -180,
      north: 70,
      east: 180,
    });
  });
});

describe("groupByPoint", () => {
  it("groups items at the same point, keeping the order", () => {
    const groups = groupByPoint([
      item("a", 41.4332802, 22.0122593),
      item("b", 41.432539, 22.007193),
      item("c", 41.4332802, 22.0122593, "found"),
      item("d", 41.433281, 22.012259),
    ]);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([
      ["a", "c", "d"],
      ["b"],
    ]);
    expect(groups[0]).toMatchObject({ lat: 41.4332802, lng: 22.0122593 });
  });

  it("keeps points more than ~1 m apart separate", () => {
    expect(
      groupByPoint([
        item("a", 41.43328, 22.01226),
        item("b", 41.4333, 22.01226),
      ]),
    ).toHaveLength(2);
  });
});

describe("fetchMapItems", () => {
  function fakeClient(result: { data: unknown; error: unknown }) {
    const request = {
      abortSignal: vi.fn(() => request),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(result).then(resolve),
    };
    const rpc = vi.fn(() => request);
    return { client: { rpc } as never, rpc, request };
  }

  const row = {
    id: "i1",
    type: "found",
    title: "Keys",
    occurred_on: "2026-09-02",
    location_name: null,
    lat: 41.9,
    lng: 21.4,
    category_slug: "keys",
    category_icon: "key-round",
    category_name_mk: "Клучеви",
    category_name_en: "Keys",
    cover_path: null,
    total_count: 7,
  };

  it("calls items_in_bounds with the clamped area (across the antimeridian: every longitude) and maps the rows", async () => {
    const { client, rpc, request } = fakeClient({ data: [row], error: null });
    const signal = new AbortController().signal;
    const result = await fetchMapItems(
      client,
      { south: 41, west: -190, north: 42, east: 22 },
      { type: "found", signal },
    );
    expect(rpc).toHaveBeenCalledWith("items_in_bounds", {
      min_lat: 41,
      min_lng: -180,
      max_lat: 42,
      max_lng: 180,
      item_type: "found",
    });
    expect(request.abortSignal).toHaveBeenCalledWith(signal);
    expect(result).toEqual({
      total: 7,
      items: [
        {
          id: "i1",
          type: "found",
          title: "Keys",
          occurredOn: "2026-09-02",
          locationName: null,
          lat: 41.9,
          lng: 21.4,
          category: {
            slug: "keys",
            icon: "key-round",
            name_mk: "Клучеви",
            name_en: "Keys",
          },
          coverPath: null,
        },
      ],
    });
  });

  it("sends no type for all types, and total 0 without rows", async () => {
    const { client, rpc } = fakeClient({ data: [], error: null });
    const result = await fetchMapItems(client, {
      south: 41,
      west: 21,
      north: 42,
      east: 22,
    });
    expect(rpc).toHaveBeenCalledWith(
      "items_in_bounds",
      expect.objectContaining({ item_type: undefined }),
    );
    expect(result).toEqual({ items: [], total: 0 });
  });

  it("throws on errors", async () => {
    const { client } = fakeClient({
      data: null,
      error: { message: "invalid_bounds" },
    });
    await expect(
      fetchMapItems(client, { south: 1, west: 1, north: 2, east: 2 }),
    ).rejects.toThrow("invalid_bounds");
  });
});
