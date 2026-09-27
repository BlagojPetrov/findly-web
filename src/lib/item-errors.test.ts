import { afterEach, describe, expect, it, vi } from "vitest";
import { itemWriteFailure } from "./item-errors";

afterEach(() => vi.restoreAllMocks());

describe("itemWriteFailure", () => {
  it.each([
    [
      { code: "FL429", message: "daily_item_limit" },
      { ok: false, error: "rate_limited" },
    ],
    [
      { code: "23514", message: "occurred_on_in_future" },
      {
        ok: false,
        error: "validation",
        fieldErrors: { occurredOn: ["dateInFuture"] },
      },
    ],
    [
      { code: "23514", message: "too_many_images" },
      {
        ok: false,
        error: "validation",
        fieldErrors: { imagePaths: ["tooManyImages"] },
      },
    ],
    [
      { code: "23503", message: "violates foreign key constraint" },
      {
        ok: false,
        error: "validation",
        fieldErrors: { categoryId: ["categoryInvalid"] },
      },
    ],
    [
      { code: "42501", message: "new row violates row-level security policy" },
      { ok: false, error: "forbidden" },
    ],
    [
      { code: "P0002", message: "item_not_found" },
      { ok: false, error: "not_found" },
    ],
  ])("maps %j", (error, expected) => {
    expect(itemWriteFailure(error)).toEqual(expected);
  });

  it.each([
    { code: "23514", message: "items_title_check" },
    { code: "23505", message: "duplicate key" },
    { message: "fetch failed" },
  ])("logs other errors as database errors: %j", (error) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(itemWriteFailure(error)).toEqual({ ok: false, error: "database" });
    expect(log).toHaveBeenCalledOnce();
  });
});
