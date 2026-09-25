"use client";

import { Camera, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { removeAvatar, updateAvatar } from "@/actions/profile";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { AVATAR_BUCKET, AVATAR_SIZE, newAvatarPath } from "@/lib/avatars";
import {
  ACCEPTED_IMAGE_TYPES,
  checkImageFile,
  resizeImage,
} from "@/lib/images";
import { createClient } from "@/lib/supabase/client";

// Top card of the profile page: picture, name and email, and the picture
// controls. A picked picture is resized in the browser, uploaded straight to
// Storage (own folder only, enforced by the storage policies) and then the
// server points the profile to it.
export function ProfileHeader({
  userId,
  displayName,
  email,
  avatarPath,
}: {
  userId: string;
  displayName: string;
  email: string | null;
  avatarPath: string | null;
}) {
  const t = useTranslations("Profile");
  const tErrors = useTranslations("Errors");
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function upload(file: File) {
    const problem = checkImageFile(file);
    if (problem) {
      setError(t(problem === "type" ? "avatarInvalidType" : "avatarTooLarge"));
      return;
    }

    let image;
    try {
      image = await resizeImage(file, { maxSize: AVATAR_SIZE, square: true });
    } catch {
      setError(t("avatarProcessingFailed"));
      return;
    }

    const supabase = createClient();
    const bucket = supabase.storage.from(AVATAR_BUCKET);
    const path = newAvatarPath(userId, image.type);
    // A new name per upload, so the file can be cached for a long time.
    const { error: uploadError } = await bucket.upload(path, image.blob, {
      contentType: image.type,
      cacheControl: "31536000",
    });
    if (uploadError) {
      console.error(`Avatar upload failed: ${uploadError.message}`);
      setError(t("avatarUploadFailed"));
      return;
    }

    const formData = new FormData();
    formData.set("path", path);
    const result = await updateAvatar(formData);
    if (!result.ok) {
      // The profile still points to the old picture; drop the new file.
      await bucket.remove([path]);
      setError(tErrors(result.error));
      return;
    }
    toast.success(t("avatarUpdated"));
  }

  function run(task: () => Promise<void>) {
    setError(null);
    startTransition(task);
  }

  function handleRemove() {
    run(async () => {
      const result: ActionResult = await removeAvatar();
      if (result.ok) toast.success(t("avatarRemoved"));
      else setError(tErrors(result.error));
    });
  }

  const pickLabel = avatarPath ? t("avatarChange") : t("avatarUpload");
  const pick = () => inputRef.current?.click();

  return (
    <section className="rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col items-center gap-5 px-5 py-6 text-center sm:flex-row sm:gap-6 sm:px-8 sm:py-8 sm:text-left">
        <div className="relative shrink-0">
          <UserAvatar
            name={displayName}
            avatarPath={avatarPath}
            className="size-24 shadow-sm ring-4 ring-background *:data-[slot=avatar-fallback]:text-3xl sm:size-28"
          />
          {pending && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
              <LoaderCircle
                className="size-6 animate-spin text-primary"
                aria-hidden
              />
            </div>
          )}
          <button
            type="button"
            onClick={pick}
            disabled={pending}
            aria-label={pickLabel}
            className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 sm:right-1 sm:bottom-1"
          >
            <Camera className="size-4" aria-hidden />
          </button>
        </div>

        <div className="grid min-w-0 flex-1 gap-4">
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold tracking-tight">
              {displayName}
            </p>
            {email && (
              <p className="truncate text-sm text-muted-foreground">{email}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              data-testid="avatar-input"
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Allow picking the same file again after an error.
                event.target.value = "";
                if (file) run(() => upload(file));
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={pick}
            >
              <Upload aria-hidden />
              {pickLabel}
            </Button>
            {avatarPath && (
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={handleRemove}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 aria-hidden />
                {t("avatarRemove")}
              </Button>
            )}
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{t("avatarHint")}</p>
          )}
        </div>
      </div>
    </section>
  );
}
