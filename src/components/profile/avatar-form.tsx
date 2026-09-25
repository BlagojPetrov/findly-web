"use client";

import { LoaderCircle, Trash2, Upload } from "lucide-react";
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

// Picks a picture, resizes it in the browser, uploads it straight to
// Storage (own folder only, enforced by the storage policies) and then lets
// the server point the profile to it.
export function AvatarForm({
  userId,
  displayName,
  avatarPath,
}: {
  userId: string;
  displayName: string;
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

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar
          name={displayName}
          avatarPath={avatarPath}
          className="size-20 *:data-[slot=avatar-fallback]:text-2xl"
        />
        <div className="flex flex-wrap gap-2">
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
            onClick={() => inputRef.current?.click()}
          >
            {pending ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <Upload aria-hidden />
            )}
            {avatarPath ? t("avatarChange") : t("avatarUpload")}
          </Button>
          {avatarPath && (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={handleRemove}
            >
              <Trash2 aria-hidden />
              {t("avatarRemove")}
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
