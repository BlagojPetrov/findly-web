-- P3.S2: storage bucket for item images.
--
-- The browser generates the item id, compresses every picture (WebP, JPEG
-- where the browser cannot encode WebP, max 1600 px) and uploads it to
-- "<user id>/<item id>/<random uuid>.<webp|jpg>" before the item exists;
-- create_item() then saves the paths in item_images, whose policies check
-- that the item belongs to the uploader. Files are never overwritten: a
-- changed picture is a new upload with a new name.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', true, 5242880, array['image/webp', 'image/jpeg']);

-- ---------------------------------------------------------------------------
-- Policies on storage.objects. The bucket is public: anyone can load an
-- image by its URL without a select policy. Through the API:
--   * insert: own folder, exactly "<uid>/<uuid>/<uuid>.<webp|jpg>" (the
--     same format item_images.storage_path accepts), not banned;
--   * select: own folder (needed to delete files and to check that an
--     upload exists); admins see all item images (moderation clean-up);
--   * delete: own folder, or admin (removing a moderated item's files);
--   * update: none — files are never replaced in place.
-- ---------------------------------------------------------------------------
create policy "Users can upload item images to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'
    and (select private.can_write())
  );

create policy "Users can see their own item images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'item-images'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.is_admin())
    )
  );

create policy "Users can delete their own item images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'item-images'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.is_admin())
    )
  );
