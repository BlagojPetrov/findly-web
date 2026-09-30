import { describe, expect, it } from "vitest";
import { matchStatusSchema } from "./matches";

const matchId = "55000000-0000-4000-8000-000000000001";

describe("matchStatusSchema", () => {
  it.each(["suggested", "dismissed", "confirmed"])("accepts %s", (status) => {
    expect(matchStatusSchema.safeParse({ matchId, status }).success).toBe(true);
  });

  it("rejects other statuses and invalid ids", () => {
    for (const value of [
      { matchId, status: "deleted" },
      { matchId, status: null },
      { matchId: "not-a-uuid", status: "confirmed" },
      { matchId: null, status: "confirmed" },
    ]) {
      const result = matchStatusSchema.safeParse(value);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe("invalidValue");
    }
  });
});
