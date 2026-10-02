import type { ChatMessage } from "@/lib/chat";
import { clockTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

// One message: the viewer's own on the right in the primary color, the other
// participant's on the left. Line breaks are kept and long words wrap
// anywhere, so no text widens the chat.
export function MessageBubble({
  message,
  own,
  sender,
}: {
  message: ChatMessage;
  own: boolean;
  // Sender for screen readers ("You" or the other participant's name).
  sender: string;
}) {
  return (
    <li
      data-own={own}
      className={cn("flex", own ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "grid max-w-[85%] gap-0.5 rounded-2xl px-3 py-2 shadow-xs sm:max-w-[75%]",
          own
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        <span className="sr-only">{sender}: </span>
        <p className="text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
          {message.body}
        </p>
        <time
          dateTime={message.createdAt}
          className={cn(
            "justify-self-end text-[0.7rem] tabular-nums",
            own ? "text-primary-foreground/75" : "text-muted-foreground",
          )}
        >
          {clockTime(new Date(message.createdAt))}
        </time>
      </div>
    </li>
  );
}
