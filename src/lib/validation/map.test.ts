import { describe, expect, it } from "vitest";
import { mapQuery, parseMapParams } from "./map";

describe("parseMapParams", () => {
  it.each([
    [{}, null],
    [{ type: "lost" }, "lost"],
    [{ type: "found" }, "found"],
    [{ type: ["found", "lost"] }, "found"],
    [{ type: "stolen" }, null],
    [{ type: "" }, null],
    [{ type: "LOST" }, null],
  ])("%j → type %j", (params, type) => {
    expect(parseMapParams(params)).toEqual({ type });
  });

  it("ignores other parameters", () => {
    expect(parseMapParams({ type: "lost", q: "keys" })).toEqual({
      type: "lost",
    });
  });
});

describe("mapQuery", () => {
  it("writes only a type", () => {
    expect(mapQuery({ type: null })).toEqual({});
    expect(mapQuery({ type: "found" })).toEqual({ type: "found" });
  });
});
