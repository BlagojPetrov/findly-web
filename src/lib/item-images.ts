import { env } from "@/lib/env";
import type { EncodedImage } from "@/lib/images";
import { ITEM_LIMITS } from "@/lib/validation/item-limits";

// Item photos live in the public "item-images" bucket at
// "<user id>/<item id>/<random uuid>.<ext>" (P3.S2). The item id is generated
// in the browser before the first upload; item_images.storage_path stores the
// path. Paths are checked with isOwnItemImagePath (@/lib/validation/items).

export const ITEM_IMAGES_BUCKET = "item-images";
export const MAX_ITEM_IMAGES = ITEM_LIMITS.images;
// Longest side of a stored photo in pixels (AD-17).
export const ITEM_IMAGE_MAX_SIZE = 1600;
export const ITEM_IMAGE_QUALITY = 0.8;

const extensions = { "image/webp": "webp", "image/jpeg": "jpg" } as const;

export function newItemImagePath(
  userId: string,
  itemId: string,
  type: EncodedImage["type"],
) {
  return `${userId}/${itemId}/${crypto.randomUUID()}.${extensions[type]}`;
}

export function itemImageUrl(path: string) {
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${ITEM_IMAGES_BUCKET}/${path}`;
}

// Returns a copy of the list with the element at `from` moved to `to`.
// Out-of-range positions return the list unchanged.
export function moveImage<T>(list: readonly T[], from: number, to: number) {
  if (from === to || !(from in list) || !(to in list)) return [...list];
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// Splits newly picked files into those that still fit (up to the maximum)
// and the number that do not.
export function takeWithinLimit<T>(
  files: readonly T[],
  current: number,
  max = MAX_ITEM_IMAGES,
) {
  const room = Math.max(0, max - current);
  return {
    accepted: files.slice(0, room),
    rejected: Math.max(0, files.length - room),
  };
}

// Uploads a photo to Storage as the signed-in user and reports progress
// (0–1). supabase-js has no progress events, so this sends the same request
// (POST /storage/v1/object/<bucket>/<path>) with XMLHttpRequest; the storage
// policies apply exactly as with supabase-js. Browser only.
export function uploadItemImage({
  path,
  image,
  accessToken,
  onProgress,
  signal,
}: {
  path: string;
  image: EncodedImage;
  accessToken: string;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    xhr.open(
      "POST",
      `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${ITEM_IMAGES_BUCKET}/${encodedPath}`,
    );
    xhr.setRequestHeader("authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    xhr.setRequestHeader("content-type", image.type);
    // A new name per upload, so the file can be cached for a long time.
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve();
      } else {
        reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed: network error"));
    xhr.onabort = () =>
      reject(new DOMException("Upload aborted", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });

    xhr.send(image.blob);
  });
}
