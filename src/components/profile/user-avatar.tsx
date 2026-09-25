import type { ComponentProps } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarUrl, initials } from "@/lib/avatars";

// Profile picture with the name's initials as the fallback (no picture, or
// while it loads). Decorative: the name is always shown or announced nearby.
export function UserAvatar({
  name,
  avatarPath,
  ...props
}: ComponentProps<typeof Avatar> & {
  name: string;
  avatarPath: string | null;
}) {
  const src = avatarUrl(avatarPath);

  return (
    <Avatar {...props}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
