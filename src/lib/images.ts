// Image processing in the browser before upload: avatars (P2.S8) and item
// photos (P3.S4). Only the resize/encode functions need a browser; the size
// calculations are plain functions.

// Types browsers can decode everywhere (HEIC cannot be decoded by most).
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Limit for the file the user picks; the uploaded result is much smaller.
export const MAX_INPUT_IMAGE_BYTES = 10 * 1024 * 1024;

export type Size = { width: number; height: number };
export type Rect = Size & { x: number; y: number };

export type ImageProblem = "type" | "size";

// Checks the picked file before it is decoded.
export function checkImageFile(file: { type: string; size: number }) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "type";
  if (file.size > MAX_INPUT_IMAGE_BYTES) return "size";
  return null;
}

// The largest centered square of an image (for avatars).
export function centerSquare({ width, height }: Size): Rect {
  const side = Math.min(width, height);
  return {
    x: Math.floor((width - side) / 2),
    y: Math.floor((height - side) / 2),
    width: side,
    height: side,
  };
}

// Scales a size down to fit within max × max, keeping the aspect ratio.
// Never scales up.
export function fitWithin({ width, height }: Size, max: number): Size {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export type EncodedImage = { blob: Blob; type: "image/webp" | "image/jpeg" };

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
}

// Decodes an image file, optionally crops it to a centered square, scales it
// down to maxSize and encodes it as WebP (JPEG in browsers that cannot encode
// WebP). Throws if the file cannot be decoded. EXIF orientation is applied by
// createImageBitmap.
export async function resizeImage(
  file: Blob,
  {
    maxSize,
    square = false,
    quality = 0.85,
  }: {
    maxSize: number;
    square?: boolean;
    quality?: number;
  },
): Promise<EncodedImage> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  try {
    const source: Rect = square
      ? centerSquare(bitmap)
      : { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
    const target = fitWithin(source, maxSize);
    canvas.width = target.width;
    canvas.height = target.height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is not available");
    // JPEG has no transparency: transparent PNG areas become white, not black.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, target.width, target.height);
    context.imageSmoothingQuality = "high";
    context.drawImage(
      bitmap,
      source.x,
      source.y,
      source.width,
      source.height,
      0,
      0,
      target.width,
      target.height,
    );
  } finally {
    bitmap.close();
  }

  // Browsers that cannot encode WebP silently return PNG instead.
  const webp = await toBlob(canvas, "image/webp", quality);
  if (webp?.type === "image/webp") return { blob: webp, type: "image/webp" };

  const jpeg = await toBlob(canvas, "image/jpeg", quality);
  if (!jpeg) throw new Error("The image could not be encoded");
  return { blob: jpeg, type: "image/jpeg" };
}
