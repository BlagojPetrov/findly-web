import { describe, expect, it } from "vitest";
import { avatarUrl, initials, isOwnAvatarPath, newAvatarPath } from "./avatars";

const userId = "0f8fad5b-d9cb-469f-a165-70867728950e";
const otherId = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

describe("newAvatarPath", () => {
  it("puts a random file name in the user's folder", () => {
    const webp = newAvatarPath(userId, "image/webp");
    expect(webp).toMatch(new RegExp(`^${userId}/[0-9a-f-]{36}\\.webp$`));
    expect(newAvatarPath(userId, "image/jpeg")).toMatch(/\.jpg$/);
    expect(newAvatarPath(userId, "image/webp")).not.toBe(webp);
  });

  it("creates paths that pass isOwnAvatarPath", () => {
    expect(isOwnAvatarPath(newAvatarPath(userId, "image/webp"), userId)).toBe(
      true,
    );
  });
});

describe("isOwnAvatarPath", () => {
  const file = "3b241101-e2bb-4255-8caf-4136c566a962";

  it.each([
    `${otherId}/${file}.webp`,
    `${userId}/${file}.png`,
    `${userId}/avatar.webp`,
    `${userId}/sub/${file}.webp`,
    `../${userId}/${file}.webp`,
    `${userId}/${file}.webp?x=1`,
    `${userId.toUpperCase()}/${file}.webp`,
    "",
  ])("rejects %s", (path) => {
    expect(isOwnAvatarPath(path, userId)).toBe(false);
  });

  it("accepts the user's own WebP and JPEG files", () => {
    expect(isOwnAvatarPath(`${userId}/${file}.webp`, userId)).toBe(true);
    expect(isOwnAvatarPath(`${userId}/${file}.jpg`, userId)).toBe(true);
  });
});

describe("avatarUrl", () => {
  it("builds the public storage URL", () => {
    expect(avatarUrl(`${userId}/a.webp`)).toBe(
      `https://test-project.supabase.co/storage/v1/object/public/avatars/${userId}/a.webp`,
    );
  });

  it("returns null without a path", () => {
    expect(avatarUrl(null)).toBeNull();
    expect(avatarUrl("")).toBeNull();
  });
});

describe("initials", () => {
  it.each([
    ["Ana Petrova", "AP"],
    ["  ана  петрова  ", "АП"],
    ["Ana Maria Petrova", "AM"],
    ["ana", "A"],
  ])("%s → %s", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
