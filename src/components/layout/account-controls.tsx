"use client";

import { MessagesLink } from "@/components/chat/messages-link";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";

export type AccountControlsProps = {
  userId: string;
  displayName: string;
  email: string | null;
  avatarPath: string | null;
  isAdmin: boolean;
  unread: number | null;
  unreadMessages: number | null;
};

// The signed-in part of the header. Loaded through `LazyAccountControls`, so
// its client code (Supabase client, Realtime, notifications) is a chunk of
// its own that guests never download (P11.S5).
export function AccountControls({
  userId,
  displayName,
  email,
  avatarPath,
  isAdmin,
  unread,
  unreadMessages,
}: AccountControlsProps) {
  return (
    <>
      {/* A new key per account: no state or subscription of the
          previous user survives an account switch. */}
      <MessagesLink
        key={`messages-${userId}`}
        userId={userId}
        initialUnread={unreadMessages}
      />
      <NotificationBell key={userId} userId={userId} initialUnread={unread} />
      <UserMenu
        displayName={displayName}
        email={email}
        avatarPath={avatarPath}
        isAdmin={isAdmin}
      />
    </>
  );
}
