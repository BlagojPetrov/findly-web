import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import mk from "../../messages/mk.json";

// Returns every leaf key as a dotted path, e.g. "Home.steps.report.title".
function keyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("translations", () => {
  it("mk.json and en.json have the same keys", () => {
    expect(keyPaths(en).sort()).toEqual(keyPaths(mk).sort());
  });

  it("has no empty messages", () => {
    for (const messages of [mk, en]) {
      const empty = keyPaths(messages).filter((path) => {
        const text = path
          .split(".")
          .reduce<unknown>(
            (node, key) => (node as Record<string, unknown>)[key],
            messages,
          );
        return typeof text !== "string" || text.trim() === "";
      });
      expect(empty).toEqual([]);
    }
  });
});
