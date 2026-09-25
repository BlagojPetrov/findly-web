import { describe, expect, it } from "vitest";
import { centerSquare, checkImageFile, fitWithin } from "./images";

describe("checkImageFile", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s", (type) => {
    expect(checkImageFile({ type, size: 1000 })).toBeNull();
  });

  it.each(["image/heic", "image/gif", "application/pdf", ""])(
    "rejects type %s",
    (type) => {
      expect(checkImageFile({ type, size: 1000 })).toBe("type");
    },
  );

  it("rejects files over 10 MB", () => {
    expect(checkImageFile({ type: "image/jpeg", size: 10 * 1024 * 1024 })).toBe(
      null,
    );
    expect(
      checkImageFile({ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 }),
    ).toBe("size");
  });
});

describe("centerSquare", () => {
  it("crops landscape images from the middle", () => {
    expect(centerSquare({ width: 400, height: 300 })).toEqual({
      x: 50,
      y: 0,
      width: 300,
      height: 300,
    });
  });

  it("crops portrait images from the middle", () => {
    expect(centerSquare({ width: 300, height: 401 })).toEqual({
      x: 0,
      y: 50,
      width: 300,
      height: 300,
    });
  });

  it("keeps square images", () => {
    expect(centerSquare({ width: 256, height: 256 })).toEqual({
      x: 0,
      y: 0,
      width: 256,
      height: 256,
    });
  });
});

describe("fitWithin", () => {
  it("scales the longer side down to the maximum", () => {
    expect(fitWithin({ width: 4000, height: 3000 }, 1600)).toEqual({
      width: 1600,
      height: 1200,
    });
    expect(fitWithin({ width: 3000, height: 4000 }, 1600)).toEqual({
      width: 1200,
      height: 1600,
    });
  });

  it("never scales up", () => {
    expect(fitWithin({ width: 100, height: 50 }, 256)).toEqual({
      width: 100,
      height: 50,
    });
  });

  it("keeps at least one pixel", () => {
    expect(fitWithin({ width: 10000, height: 1 }, 256)).toEqual({
      width: 256,
      height: 1,
    });
  });
});
