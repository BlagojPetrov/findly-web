import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { isOwnItemImagePath, itemSchema, itemStatusSchema } from "./items";

const userId = "00000000-0000-4000-8000-00000000000a";
const otherUserId = "00000000-0000-4000-8000-00000000000b";
const itemId = "10000000-0000-4000-8000-000000000001";
const otherItemId = "10000000-0000-4000-8000-000000000002";
const imagePath = (n: number, ext = "webp", user = userId, item = itemId) =>
  `${user}/${item}/20000000-0000-4000-8000-00000000000${n}.${ext}`;

const schema = itemSchema({ categoryIds: [1, 2, 8], userId });

// Form values as the action reads them from FormData (strings or null).
const valid = {
  itemId,
  type: "lost",
  title: "  Car keys  ",
  description: "Black key ring with two keys.",
  categoryId: "2",
  occurredOn: "2026-09-25",
  locationName: "  City Park  ",
  lat: "41.9981",
  lng: "21.4254",
  imagePaths: [imagePath(1), imagePath(2, "jpg")],
};

function errors(input: Record<string, unknown>) {
  const result = schema.safeParse({ ...valid, ...input });
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

// 2026-09-26 00:30 in Skopje is still 2026-09-25 in UTC.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-25T22:30:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("itemSchema", () => {
  it("accepts a valid item, trims text and converts numbers", () => {
    expect(schema.parse(valid)).toEqual({
      itemId,
      type: "lost",
      title: "Car keys",
      description: "Black key ring with two keys.",
      categoryId: 2,
      occurredOn: "2026-09-25",
      locationName: "City Park",
      lat: 41.9981,
      lng: 21.4254,
      imagePaths: [imagePath(1), imagePath(2, "jpg")],
    });
  });

  it("accepts an item without location name and images", () => {
    const item = schema.parse({
      ...valid,
      locationName: "   ",
      imagePaths: [],
    });
    expect(item.locationName).toBeNull();
    expect(item.imagePaths).toEqual([]);
  });

  it.each([null, "", "stolen"])("rejects the type %j", (type) => {
    expect(errors({ type }).type).toEqual(["itemTypeInvalid"]);
  });

  it.each([
    ["title", null, "required"],
    ["title", "   ", "required"],
    ["title", "ab", "titleTooShort"],
    ["title", "x".repeat(101), "titleTooLong"],
    ["description", "", "required"],
    ["description", "Too short", "descriptionTooShort"],
    ["description", "x".repeat(2001), "descriptionTooLong"],
    ["locationName", "x".repeat(201), "locationNameTooLong"],
  ])("rejects %s %j", (field, value, message) => {
    expect(errors({ [field]: value })[field as keyof typeof valid]?.[0]).toBe(
      message,
    );
  });

  it("accepts the maximum lengths", () => {
    expect(
      errors({
        title: "x".repeat(100),
        description: "x".repeat(2000),
        locationName: "x".repeat(200),
      }),
    ).toEqual({});
  });

  it("counts form line breaks once and stores them as \\n (F-32)", () => {
    const lines = Array.from({ length: 400 }, () => "abcd").join("\r\n");
    expect(lines.length).toBe(2398);
    const item = schema.parse({ ...valid, description: `${lines}\r\n` });
    expect(item.description).toBe(lines.replaceAll("\r\n", "\n"));
    expect(item.description).toHaveLength(1999);
    const short = schema.parse({ ...valid, description: "Line one\r\ntwo\r" });
    expect(short.description).toBe("Line one\ntwo");
  });

  it.each([
    [null, "required"],
    ["", "required"],
    ["3", "categoryInvalid"],
    ["0", "categoryInvalid"],
    ["abc", "categoryInvalid"],
    ["2.5", "categoryInvalid"],
  ])("rejects the category %j", (categoryId, message) => {
    expect(errors({ categoryId }).categoryId?.[0]).toBe(message);
  });

  describe("occurredOn", () => {
    it("accepts today in Macedonia, even when it is still yesterday in UTC", () => {
      expect(errors({ occurredOn: "2026-09-26" })).toEqual({});
    });

    it("rejects tomorrow", () => {
      expect(errors({ occurredOn: "2026-09-27" }).occurredOn).toEqual([
        "dateInFuture",
      ]);
    });

    it.each([
      [null, "required"],
      ["", "required"],
      ["2026-02-30", "dateInvalid"],
      ["25.09.2026", "dateInvalid"],
    ])("rejects %j", (occurredOn, message) => {
      expect(errors({ occurredOn }).occurredOn?.[0]).toBe(message);
    });
  });

  describe("coordinates", () => {
    it.each([
      ["90", "180"],
      ["-90", "-180"],
      ["0", "0"],
    ])("accepts lat %s, lng %s", (lat, lng) => {
      expect(errors({ lat, lng })).toEqual({});
    });

    it.each([
      ["lat", "90.1"],
      ["lat", "-91"],
      ["lng", "180.5"],
      ["lng", "-181"],
      ["lat", "north"],
      ["lng", "Infinity"],
    ])("rejects %s %j", (field, value) => {
      expect(errors({ [field]: value })[field as "lat" | "lng"]).toEqual([
        "locationInvalid",
      ]);
    });

    it("requires both coordinates", () => {
      expect(errors({ lat: "", lng: null })).toEqual({
        lat: ["locationRequired"],
        lng: ["locationRequired"],
      });
      expect(errors({ lng: "  " })).toEqual({ lng: ["locationRequired"] });
      expect(errors({ lat: undefined })).toEqual({ lat: ["locationRequired"] });
    });
  });

  describe("imagePaths", () => {
    it("accepts 5 images and rejects 6", () => {
      const paths = [1, 2, 3, 4, 5, 6].map((n) => imagePath(n));
      expect(errors({ imagePaths: paths.slice(0, 5) })).toEqual({});
      expect(errors({ imagePaths: paths }).imagePaths).toEqual([
        "tooManyImages",
      ]);
    });

    it.each([
      ["another user's folder", imagePath(3, "webp", otherUserId)],
      ["another item's folder", imagePath(3, "webp", userId, otherItemId)],
      ["another extension", imagePath(3, "png")],
      ["a path outside the item folder", `${userId}/photo.webp`],
      ["a path traversal", `${userId}/${itemId}/../x.webp`],
    ])("rejects %s", (_, path) => {
      expect(errors({ imagePaths: [imagePath(1), path] }).imagePaths).toEqual([
        "imageInvalid",
      ]);
    });

    it("rejects the same image twice", () => {
      expect(
        errors({ imagePaths: [imagePath(1), imagePath(1)] }).imagePaths,
      ).toEqual(["imageInvalid"]);
    });
  });

  it("rejects an invalid item id", () => {
    expect(errors({ itemId: "not-a-uuid" }).itemId).toEqual(["invalidValue"]);
  });
});

describe("isOwnItemImagePath", () => {
  it("accepts only the user's own folder for the item", () => {
    expect(isOwnItemImagePath(imagePath(1), userId, itemId)).toBe(true);
    expect(isOwnItemImagePath(imagePath(1, "jpg"), userId, itemId)).toBe(true);
    expect(isOwnItemImagePath(imagePath(1), otherUserId, itemId)).toBe(false);
    expect(isOwnItemImagePath(imagePath(1), userId, otherItemId)).toBe(false);
    expect(isOwnItemImagePath(`x${imagePath(1)}`, userId, itemId)).toBe(false);
  });
});

describe("itemStatusSchema", () => {
  it.each(["active", "resolved"])("accepts %s", (status) => {
    expect(itemStatusSchema.safeParse({ itemId, status }).success).toBe(true);
  });

  it.each(["hidden", "", null])("rejects %j", (status) => {
    expect(itemStatusSchema.safeParse({ itemId, status }).success).toBe(false);
  });

  it("rejects an invalid id", () => {
    expect(
      itemStatusSchema.safeParse({ itemId: "x", status: "resolved" }).success,
    ).toBe(false);
  });
});
