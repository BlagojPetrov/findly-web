import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminStats } from "./admin";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("server-only", () => ({}));
// rpc(name).single() → rpc(name)'s result.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: (name: string) => ({ single: async () => rpc(name) }),
  }),
}));

const stats = {
  users: 12,
  banned_users: 1,
  active_lost_items: 4,
  active_found_items: 3,
  hidden_items: 1,
  matches: 5,
  confirmed_matches: 2,
  open_reports: 3,
  reported_items: 2,
};

beforeEach(() => {
  rpc.mockReset();
});

describe("getAdminStats", () => {
  it("returns the single row of admin_stats()", async () => {
    rpc.mockResolvedValue({ data: stats, error: null });
    expect(await getAdminStats()).toEqual(stats);
    expect(rpc).toHaveBeenCalledWith("admin_stats");
  });

  it("throws for non-admins and other errors", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "admin only" },
    });
    await expect(getAdminStats()).rejects.toThrow(
      "Failed to load the admin stats: admin only",
    );
  });
});
