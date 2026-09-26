"use client";

import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  LoaderCircle,
  RotateCw,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  ITEM_IMAGE_MAX_SIZE,
  ITEM_IMAGE_QUALITY,
  ITEM_IMAGES_BUCKET,
  MAX_ITEM_IMAGES,
  itemImageUrl,
  moveImage,
  newItemImagePath,
  takeWithinLimit,
  uploadItemImage,
} from "@/lib/item-images";
import {
  ACCEPTED_IMAGE_TYPES,
  checkImageFile,
  resizeImage,
} from "@/lib/images";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Entry = {
  key: string;
  // Blob URL of the picked file, or the public URL of a saved photo.
  previewUrl: string;
  status: "processing" | "uploading" | "done" | "error";
  // Upload progress, 0–1.
  progress: number;
  // Storage path once uploaded.
  path: string | null;
  // Picked in this form (not a saved photo): kept for retries, and its file
  // is deleted from Storage when it is removed again.
  file: File | null;
};

function savedEntry(path: string): Entry {
  return {
    key: path,
    previewUrl: itemImageUrl(path),
    status: "done",
    progress: 1,
    path,
    file: null,
  };
}

// Photo picker for the item form. Picked photos are resized in the browser
// (WebP, max 1600 px), uploaded straight to Storage under
// "<user id>/<item id>/…" (own folder only, enforced by the storage
// policies) and submitted as hidden `name` inputs in display order; the
// first photo is the cover. The form must not submit while `onPendingChange`
// reports pending uploads.
export function ImagePicker({
  userId,
  itemId,
  name = "imagePaths",
  defaultPaths = [],
  onPendingChange,
  disabled = false,
  describedBy,
}: {
  userId: string;
  // Generated in the browser (crypto.randomUUID()) before the first upload.
  itemId: string;
  name?: string;
  // Paths of already saved photos (edit form).
  defaultPaths?: string[];
  onPendingChange?: (pending: boolean) => void;
  disabled?: boolean;
  describedBy?: string;
}) {
  const t = useTranslations("ImagePicker");
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<Entry[]>(() =>
    defaultPaths.map(savedEntry),
  );
  const [problems, setProblems] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  // One photo is processed at a time: decoding several large photos at once
  // can exhaust memory on phones.
  const queue = useRef(Promise.resolve());
  const controllers = useRef(new Map<string, AbortController>());
  const blobUrls = useRef(new Set<string>());
  // Latest entries for callbacks that run after an await.
  const entriesRef = useRef(entries);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const pending = entries.some(
    (entry) => entry.status === "processing" || entry.status === "uploading",
  );
  useEffect(() => onPendingChange?.(pending), [pending, onPendingChange]);

  // Release blob URLs and stop uploads when the form goes away.
  useEffect(() => {
    const urls = blobUrls.current;
    const running = controllers.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      running.forEach((controller) => controller.abort());
    };
  }, []);

  function update(key: string, patch: Partial<Entry>) {
    setEntries((list) =>
      list.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)),
    );
  }

  async function process(key: string, file: File) {
    const controller = new AbortController();
    controllers.current.set(key, controller);
    const { signal } = controller;
    const supabase = createClient();

    try {
      update(key, { status: "processing", progress: 0 });
      let image;
      try {
        image = await resizeImage(file, {
          maxSize: ITEM_IMAGE_MAX_SIZE,
          quality: ITEM_IMAGE_QUALITY,
        });
      } catch {
        // The file cannot be decoded; retrying would not help.
        if (signal.aborted) return;
        remove(key);
        setProblems((list) => [
          ...list,
          t("processingFailed", { name: file.name }),
        ]);
        return;
      }
      if (signal.aborted) return;

      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("No session");

      const path = newItemImagePath(userId, itemId, image.type);
      update(key, { status: "uploading" });
      await uploadItemImage({
        path,
        image,
        accessToken: data.session.access_token,
        signal,
        onProgress: (progress) => update(key, { progress }),
      });

      if (signal.aborted) {
        // Removed while the upload was finishing: drop the file again.
        await supabase.storage.from(ITEM_IMAGES_BUCKET).remove([path]);
        return;
      }
      update(key, { status: "done", progress: 1, path });
    } catch (error) {
      if (signal.aborted) return;
      console.error("Item photo upload failed:", error);
      update(key, { status: "error" });
    } finally {
      controllers.current.delete(key);
    }
  }

  function enqueue(key: string, file: File) {
    queue.current = queue.current.then(() => process(key, file));
  }

  function addFiles(files: File[]) {
    if (disabled) return;
    const found: string[] = [];
    const valid = files.filter((file) => {
      const problem = checkImageFile(file);
      if (problem === "type") found.push(t("invalidType", { name: file.name }));
      if (problem === "size") found.push(t("tooLarge", { name: file.name }));
      return !problem;
    });

    const { accepted, rejected } = takeWithinLimit(
      valid,
      entriesRef.current.length,
    );
    if (rejected > 0) found.push(t("tooMany", { max: MAX_ITEM_IMAGES }));
    setProblems(found);

    const added = accepted.map((file): Entry => {
      const previewUrl = URL.createObjectURL(file);
      blobUrls.current.add(previewUrl);
      return {
        key: crypto.randomUUID(),
        previewUrl,
        status: "processing",
        progress: 0,
        path: null,
        file,
      };
    });
    // Counted right away, so a second drop before the next render also
    // respects the limit.
    entriesRef.current = [...entriesRef.current, ...added];
    setEntries((list) => [...list, ...added]);
    added.forEach((entry) => enqueue(entry.key, entry.file!));
  }

  function remove(key: string) {
    const entry = entriesRef.current.find((item) => item.key === key);
    controllers.current.get(key)?.abort();
    setEntries((list) => list.filter((item) => item.key !== key));
    if (!entry) return;
    if (blobUrls.current.delete(entry.previewUrl)) {
      URL.revokeObjectURL(entry.previewUrl);
    }
    // A photo uploaded in this form is not used anywhere yet. Saved photos
    // are deleted by the edit action when the form is submitted.
    if (entry.file && entry.path) {
      const path = entry.path;
      void createClient()
        .storage.from(ITEM_IMAGES_BUCKET)
        .remove([path])
        .then(({ error }) => {
          if (error) console.error(`Removing ${path} failed: ${error.message}`);
        });
    }
  }

  function move(from: number, to: number) {
    setEntries((list) => moveImage(list, from, to));
  }

  const full = entries.length >= MAX_ITEM_IMAGES;
  const paths = entries.flatMap((entry) =>
    entry.status === "done" && entry.path ? [entry.path] : [],
  );

  return (
    <div
      className="grid gap-2"
      onDragOver={(event) => {
        if (disabled || !event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setDragging(false);
      }}
      onDrop={(event) => {
        if (disabled) return;
        event.preventDefault();
        setDragging(false);
        addFiles(Array.from(event.dataTransfer.files));
      }}
    >
      {paths.map((path) => (
        <input key={path} type="hidden" name={name} value={path} />
      ))}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="item-images-input"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          // Allow picking the same file again after removing it.
          event.target.value = "";
          addFiles(files);
        }}
      />

      <ul
        className={cn(
          "grid grid-cols-3 gap-2 rounded-xl sm:grid-cols-5",
          dragging &&
            "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
        aria-label={t("listLabel")}
      >
        {entries.map((entry, index) => (
          <li
            key={entry.key}
            className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
          >
            {/* Blob URLs and Storage URLs; next/image cannot optimize blob URLs. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.previewUrl}
              alt={t("photoAlt", { number: index + 1 })}
              className={cn(
                "size-full object-cover",
                entry.status !== "done" && "opacity-60",
              )}
            />

            {index === 0 && (
              <span className="absolute top-1.5 left-1.5 rounded-md bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground shadow-sm">
                {t("cover")}
              </span>
            )}

            <button
              type="button"
              onClick={() => remove(entry.key)}
              disabled={disabled}
              aria-label={t("remove", { number: index + 1 })}
              className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors outline-none hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              <X className="size-4" aria-hidden />
            </button>

            {entry.status === "processing" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <LoaderCircle
                  className="size-6 animate-spin text-primary"
                  aria-hidden
                />
                <span className="sr-only">{t("processing")}</span>
              </div>
            )}

            {entry.status === "uploading" && (
              <div className="absolute inset-x-2 bottom-2">
                <div
                  role="progressbar"
                  aria-label={t("uploading", { number: index + 1 })}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(entry.progress * 100)}
                  className="h-1.5 overflow-hidden rounded-full bg-background/80"
                >
                  <div
                    className="h-full bg-primary transition-[width]"
                    style={{ width: `${Math.round(entry.progress * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {entry.status === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/80 p-2 text-center">
                <p className="text-xs font-medium text-destructive">
                  {t("uploadFailed")}
                </p>
                {entry.file && (
                  <button
                    type="button"
                    onClick={() => enqueue(entry.key, entry.file!)}
                    disabled={disabled}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <RotateCw className="size-3.5" aria-hidden />
                    {t("retry")}
                  </button>
                )}
              </div>
            )}

            {entries.length > 1 && entry.status !== "error" && (
              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={disabled || index === 0}
                  aria-label={t("moveEarlier", { number: index + 1 })}
                  className="flex size-7 items-center justify-center rounded-full bg-background/90 shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:invisible"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={disabled || index === entries.length - 1}
                  aria-label={t("moveLater", { number: index + 1 })}
                  className="flex size-7 items-center justify-center rounded-full bg-background/90 shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:invisible"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </div>
            )}
          </li>
        ))}

        {!full && (
          <li className="aspect-square">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              aria-describedby={describedBy}
              className="flex size-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground transition-colors outline-none hover:border-primary hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              <ImagePlus className="size-6" aria-hidden />
              <span className="text-xs font-medium">{t("add")}</span>
              <span className="text-xs">
                {t("count", { count: entries.length, max: MAX_ITEM_IMAGES })}
              </span>
            </button>
          </li>
        )}
      </ul>

      {problems.length > 0 ? (
        <ul role="alert" className="grid gap-0.5 text-sm text-destructive">
          {problems.map((problem, index) => (
            <li key={index}>{problem}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("hint", { max: MAX_ITEM_IMAGES })}
        </p>
      )}
    </div>
  );
}
