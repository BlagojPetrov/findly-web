-- P7.S1: notifications (new match, message, moderation) and their security.
-- Rows are written only by security definer triggers (match: P7.S2, message:
-- P8.S6, moderation: P10.S4); users read their own, mark them read and delete
-- them. Delivered live through Realtime (§15).

create type public.notification_type as enum ('match', 'message', 'moderation');

-- ---------------------------------------------------------------------------
-- Notifications. data holds only ids (match_id, item_id, conversation_id);
-- the UI loads titles and renders the text in the viewer's language.
-- read_at is null while unread.
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  data jsonb not null default '{}'
    check (jsonb_typeof(data) = 'object'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- The list (newest first) and the unread count of one user.
create index notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);
create index notifications_user_id_unread_idx
  on public.notifications (user_id)
  where read_at is null;

-- ---------------------------------------------------------------------------
-- Security. Privileges are reset (Supabase grants everything by default):
-- signed-in users read, update only read_at (mark read/unread) and delete;
-- nobody inserts. Anonymous visitors have no access.
-- Policies: only the user's own rows. Like every update policy, marking read
-- requires can_write(); deleting does not (as for items).
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "Users can view their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can mark their own notifications read"
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (select private.can_write())
  );

create policy "Users can delete their own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Realtime: the header bell subscribes to inserts of its own rows (P7.S3).
-- Realtime applies the select policy, so clients receive only their own.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.notifications;
