import { beforeEach, describe, expect, it, vi } from "vitest";
import { startConversation } from "./messages";

const { requireUser, itemQuery, conversationQuery, insert, redirect } =
  vi.hoisted(() => ({
    requireUser: vi.fn(),
    itemQuery: vi.fn(),
    conversationQuery: vi.fn(),
    insert: vi.fn(),
    redirect: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ requireUser }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en" }));
// redirect() ends the action by throwing, like next/navigation's.
vi.mock("@/i18n/navigation", () => ({ redirect }));
// from("items").select(cols).eq("id", id).maybeSingle()
// from("conversations").select("id").eq(...).eq(...).maybeSingle()
// from("conversations").insert(values).select("id").single()
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      const filters: [string, string][] = [];
      const query = {
        select: (columns: string) => {
          const chain = {
            eq: (column: string, value: string) => {
              filters.push([column, value]);
              return chain;
            },
            maybeSingle: async () =>
              table === "items"
                ? itemQuery(columns, filters)
                : conversationQuery(filters),
          };
          return chain;
        },
        insert: (values: object) => ({
          select: () => ({ single: async () => insert(table, values) }),
        }),
      };
      return query;
    },
  }),
}));

const userId = "00000000-0000-4000-8000-00000000000a";
const ownerId = "00000000-0000-4000-8000-00000000000b";
const itemId = "47000000-0000-4000-8000-000000000001";
const conversationId = "49000000-0000-4000-8000-000000000001";

class Redirect extends Error {}

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function item(status: "active" | "resolved" | "hidden", user_id = ownerId) {
  return { data: { id: itemId, user_id, status }, error: null };
}

// Runs the action and returns the redirect target, or the result when the
// action did not redirect.
async function run(values: Record<string, string> = { itemId }) {
  try {
    return { result: await startConversation(form(values)) };
  } catch (error) {
    if (error instanceof Redirect)
      return { redirect: redirect.mock.calls[0][0] };
    throw error;
  }
}

beforeEach(() => {
  requireUser
    .mockReset()
    .mockResolvedValue({ id: userId, profile: { is_banned: false } });
  itemQuery.mockReset().mockResolvedValue(item("active"));
  conversationQuery.mockReset().mockResolvedValue({ data: null, error: null });
  insert
    .mockReset()
    .mockResolvedValue({ data: { id: conversationId }, error: null });
  redirect.mockReset().mockImplementation(() => {
    throw new Redirect();
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("startConversation", () => {
  it("starts a conversation with the item's owner and opens it", async () => {
    expect(await run()).toEqual({
      redirect: { href: `/messages/${conversationId}`, locale: "en" },
    });
    expect(requireUser).toHaveBeenCalledWith(`/items/${itemId}`);
    expect(itemQuery).toHaveBeenCalledWith("id, user_id, status", [
      ["id", itemId],
    ]);
    // Looks for the user's own conversation about the item first.
    expect(conversationQuery).toHaveBeenCalledWith([
      ["item_id", itemId],
      ["requester_id", userId],
    ]);
    expect(insert).toHaveBeenCalledWith("conversations", {
      item_id: itemId,
      owner_id: ownerId,
    });
  });

  it("takes the owner from the item, never from the form", async () => {
    await run({ itemId, ownerId: userId, requesterId: ownerId });
    expect(insert).toHaveBeenCalledWith("conversations", {
      item_id: itemId,
      owner_id: ownerId,
    });
  });

  it("opens an existing conversation instead of starting another", async () => {
    conversationQuery.mockResolvedValue({
      data: { id: conversationId },
      error: null,
    });
    expect(await run()).toEqual({
      redirect: { href: `/messages/${conversationId}`, locale: "en" },
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it.each(["resolved", "hidden"] as const)(
    "opens an existing conversation about a %s item",
    async (status) => {
      itemQuery.mockResolvedValue(item(status));
      conversationQuery.mockResolvedValue({
        data: { id: conversationId },
        error: null,
      });
      expect((await run()).redirect).toBeDefined();
      expect(insert).not.toHaveBeenCalled();
    },
  );

  it("opens an existing conversation for a banned user", async () => {
    requireUser.mockResolvedValue({ id: userId, profile: { is_banned: true } });
    conversationQuery.mockResolvedValue({
      data: { id: conversationId },
      error: null,
    });
    expect((await run()).redirect).toBeDefined();
  });

  it("rejects an invalid item id before anything else", async () => {
    const { result } = await run({ itemId: "not-a-uuid" });
    expect(result).toMatchObject({ ok: false, error: "validation" });
    expect(requireUser).not.toHaveBeenCalled();
    expect(itemQuery).not.toHaveBeenCalled();
  });

  it("sends guests to sign in and back to the item", async () => {
    requireUser.mockRejectedValue(new Redirect());
    await expect(startConversation(form({ itemId }))).rejects.toThrow(Redirect);
    expect(requireUser).toHaveBeenCalledWith(`/items/${itemId}`);
    expect(itemQuery).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("answers not_found for a missing or inaccessible item", async () => {
    itemQuery.mockResolvedValue({ data: null, error: null });
    expect((await run()).result).toEqual({ ok: false, error: "not_found" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("does not let owners contact themselves", async () => {
    itemQuery.mockResolvedValue(item("active", userId));
    expect((await run()).result).toEqual({
      ok: false,
      error: "conversation_own_item",
    });
    expect(conversationQuery).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it.each(["resolved", "hidden"] as const)(
    "does not start a conversation about a %s item",
    async (status) => {
      itemQuery.mockResolvedValue(item(status));
      expect((await run()).result).toEqual({
        ok: false,
        error: "conversation_item_inactive",
      });
      expect(insert).not.toHaveBeenCalled();
    },
  );

  it("does not let banned users start conversations", async () => {
    requireUser.mockResolvedValue({ id: userId, profile: { is_banned: true } });
    expect((await run()).result).toEqual({ ok: false, error: "forbidden" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("maps the daily conversation limit to its own error", async () => {
    insert.mockResolvedValue({
      data: null,
      error: { code: "FL429", message: "daily_conversation_limit" },
    });
    expect((await run()).result).toEqual({
      ok: false,
      error: "conversation_limit",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("opens the conversation another request created at the same time", async () => {
    conversationQuery
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: conversationId }, error: null });
    insert.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate key value" },
    });
    expect(await run()).toEqual({
      redirect: { href: `/messages/${conversationId}`, locale: "en" },
    });
  });

  it("answers forbidden when the database policy rejects the insert", async () => {
    insert.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "new row violates row-level security" },
    });
    expect((await run()).result).toEqual({ ok: false, error: "forbidden" });
  });

  it.each([
    [
      "the item query",
      () =>
        itemQuery.mockResolvedValue({ data: null, error: { message: "boom" } }),
    ],
    [
      "the conversation query",
      () =>
        conversationQuery.mockResolvedValue({
          data: null,
          error: { message: "boom" },
        }),
    ],
    [
      "the insert",
      () =>
        insert.mockResolvedValue({
          data: null,
          error: { code: "XX000", message: "boom" },
        }),
    ],
  ])("hides database errors of %s behind a generic code", async (_, setup) => {
    setup();
    const { result } = await run();
    expect(result).toEqual({ ok: false, error: "database" });
    expect(JSON.stringify(result)).not.toContain("boom");
    expect(console.error).toHaveBeenCalled();
  });
});
