import { describe, expect, it } from "vitest";
import {
  itemImageUrl,
  moveImage,
  newItemImagePath,
  takeWithinLimit,
} from "./item-images";
import { isOwnItemImagePath } from "./validation/items";

const userId = "00000000-0000-4000-8000-00000000000a";
const itemId = "10000000-0000-4000-8000-000000000001";

describe("newItemImagePath", () => {
  it("creates a valid path in the user's folder for the item", () => {
    const webp = newItemImagePath(userId, itemId, "image/webp");
    const jpeg = newItemImagePath(userId, itemId, "image/jpeg");
    expect(webp).toMatch(/\.webp$/);
    expect(jpeg).toMatch(/\.jpg$/);
    expect(isOwnItemImagePath(webp, userId, itemId)).toBe(true);
    expect(isOwnItemImagePath(jpeg, userId, itemId)).toBe(true);
    expect(newItemImagePath(userId, itemId, "image/webp")).not.toBe(webp);
  });
});

describe("itemImageUrl", () => {
  it("points to the public item-images bucket", () => {
    expect(itemImageUrl(`${userId}/${itemId}/a.webp`)).toMatch(
      /\/storage\/v1\/object\/public\/item-images\/00000000-0000-4000-8000-00000000000a\/10000000-0000-4000-8000-000000000001\/a\.webp$/,
    );
  });
});

describe("moveImage", () => {
  const list = ["a", "b", "c", "d"];

  it.each([
    [0, 1, ["b", "a", "c", "d"]],
    [3, 0, ["d", "a", "b", "c"]],
    [1, 3, ["a", "c", "d", "b"]],
    [2, 2, list],
    [-1, 0, list],
    [0, 4, list],
  ])("moves %i to %i", (from, to, expected) => {
    expect(moveImage(list, from, to)).toEqual(expected);
  });

  it("does not change the original list", () => {
    moveImage(list, 0, 3);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });
});

describe("takeWithinLimit", () => {
  it.each([
    [3, 0, 3, 0],
    [3, 3, 2, 1],
    [6, 0, 5, 1],
    [2, 5, 0, 2],
    [1, 7, 0, 1],
  ])(
    "%i files with %i present: %i accepted, %i rejected",
    (count, current, accepted, rejected) => {
      const files = Array.from({ length: count }, (_, i) => i);
      const result = takeWithinLimit(files, current);
      expect(result.accepted).toHaveLength(accepted);
      expect(result.rejected).toBe(rejected);
    },
  );
});
