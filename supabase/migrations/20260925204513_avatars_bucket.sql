-- P2.S8: storage bucket for profile pictures.
--
-- The browser resizes the picture to 256x256 (WebP, JPEG where the browser
-- cannot encode WebP) and uploads it to "<user id>/<random uuid>.<ext>".
-- Every upload gets a new name, so browsers and the CDN never show a cached
-- old picture; the app deletes the previous file after the profile points to
-- the new one. profiles.avatar_path holds the path, not a URL.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg']);

-- ---------------------------------------------------------------------------
-- Policies on storage.objects. The bucket is public: anyone can load a
-- picture by its URL (no select policy is needed for that), but only the
-- owner can see the objects in their folder through the API. Files sit
-- directly in the owner's folder ("<uid>/<file>", no subfolders).
--   * insert: own folder, not banned;
--   * select: own folder (the API needs it to delete a file and to check
--     that an uploaded file exists; it does not let anyone list other
--     users' files);
--   * delete: own folder;
--   * update: none — files are never overwritten, so nobody can replace
--     another user's picture (or their own) in place.
-- ---------------------------------------------------------------------------
create policy "Users can upload avatars to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 1
    and private.can_write()
  );

create policy "Users can see the avatars in their own folder"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete avatars in their own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
