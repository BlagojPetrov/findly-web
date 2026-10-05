import { describe, expect, it } from "vitest";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import {
  createCategorySchema,
  reorderCategoriesSchema,
  updateCategorySchema,
} from "./categories";

const valid = {
  slug: "sports-gear",
  nameMk: " Спортска опрема ",
  nameEn: "Sports gear",
  icon: "bike",
};

function errors(result: { success: boolean; error?: unknown }) {
  return result.success
    ? {}
    : (
        result as {
          error: { flatten: () => { fieldErrors: Record<string, string[]> } };
        }
      ).error.flatten().fieldErrors;
}

describe("createCategorySchema", () => {
  it("trims names and lower-cases the slug", () => {
    expect(
      createCategorySchema.parse({ ...valid, slug: " Sports-Gear " }),
    ).toEqual({
      slug: "sports-gear",
      nameMk: "Спортска опрема",
      nameEn: "Sports gear",
      icon: "bike",
    });
  });

  it("accepts every offered icon", () => {
    for (const icon of CATEGORY_ICONS) {
      expect(createCategorySchema.safeParse({ ...valid, icon }).success).toBe(
        true,
      );
    }
  });

  it("rejects bad slugs", () => {
    for (const slug of [
      "",
      "sports gear",
      "спорт",
      "-sports",
      "sports-",
      "sports--gear",
      "sports_gear",
      "x".repeat(41),
    ]) {
      expect(
        errors(createCategorySchema.safeParse({ ...valid, slug })).slug,
        slug,
      ).toBeDefined();
    }
    // The form shows the first message.
    expect(
      errors(createCategorySchema.safeParse({ ...valid, slug: "" })).slug[0],
    ).toBe("required");
    expect(
      errors(createCategorySchema.safeParse({ ...valid, slug: "a b" })).slug,
    ).toEqual(["categorySlugInvalid"]);
  });

  it("rejects empty or long names and unknown icons", () => {
    const result = errors(
      createCategorySchema.safeParse({
        ...valid,
        nameMk: "   ",
        nameEn: "x".repeat(51),
        icon: "rocket",
      }),
    );
    expect(result).toEqual({
      nameMk: ["required"],
      nameEn: ["categoryNameTooLong"],
      icon: ["categoryIconInvalid"],
    });
  });
});

describe("updateCategorySchema", () => {
  it("reads the id and ignores the slug", () => {
    expect(updateCategorySchema.parse({ ...valid, id: "4" })).toEqual({
      id: 4,
      nameMk: "Спортска опрема",
      nameEn: "Sports gear",
      icon: "bike",
    });
    for (const id of ["", "x", "0", "1.5", "40000", null]) {
      expect(
        updateCategorySchema.safeParse({ ...valid, id }).success,
        String(id),
      ).toBe(false);
    }
  });
});

describe("reorderCategoriesSchema", () => {
  it("needs distinct ids", () => {
    expect(reorderCategoriesSchema.parse({ ids: ["3", "1", "2"] })).toEqual({
      ids: [3, 1, 2],
    });
    expect(reorderCategoriesSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(reorderCategoriesSchema.safeParse({ ids: ["1", "1"] }).success).toBe(
      false,
    );
    expect(reorderCategoriesSchema.safeParse({ ids: ["1", "x"] }).success).toBe(
      false,
    );
  });
});
