import { env } from "@/lib/env";

// Profile pictures live in the public "avatars" bucket at
// "<user id>/<random uuid>.<ext>". Every upload gets a new name, so a cached
// old picture is never shown; profiles.avatar_path stores the path.

export const AVATAR_BUCKET = "avatars";
// Width and height of the stored (square) picture in pixels.
export const AVATAR_SIZE = 256;

const extensions = { "image/webp": "webp", "image/jpeg": "jpg" } as const;
export type AvatarType = keyof typeof extensions;

const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const avatarPathPattern = new RegExp(`^(${uuid})/${uuid}\\.(webp|jpg)$`);

export function newAvatarPath(userId: string, type: AvatarType) {
  return `${userId}/${crypto.randomUUID()}.${extensions[type]}`;
}

// True only for a path in the user's own folder in the format above.
export function isOwnAvatarPath(path: string, userId: string) {
  return avatarPathPattern.exec(path)?.[1] === userId;
}

export function avatarUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}

// "Ana Petrova" → "AP"; shown when there is no picture.
export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
