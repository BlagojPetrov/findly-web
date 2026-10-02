"use client";

import { LoaderCircle, SendHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type KeyboardEvent,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { sendMessage } from "@/actions/messages";
import { FormError } from "@/components/forms/form-error";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { type ChatMessage, MESSAGE_MAX_LENGTH } from "@/lib/chat";
import type { ValidationMessage } from "@/lib/validation/messages";

type Failure = Extract<ActionResult, { ok: false }>;

// The counter appears this close to the limit.
const COUNTER_FROM = MESSAGE_MAX_LENGTH - 200;

// Writes and sends a message. The text stays in the field (read-only) until
// the server has stored it, so a failed send never loses it; a sent message
// is handed to the chat right away (its Realtime event is merged by id).
// Enter sends, Shift+Enter adds a line (not while an IME is composing).
export function MessageComposer({
  conversationId,
  onSent,
}: {
  conversationId: string;
  onSent: (message: ChatMessage) => void;
}) {
  const t = useTranslations("Messages.chat");
  const tValidation = useTranslations("Validation");
  const [body, setBody] = useState("");
  const [failure, setFailure] = useState<Failure>();
  const [pending, startTransition] = useTransition();
  const field = useRef<HTMLTextAreaElement>(null);
  const errorId = useId();

  const empty = body.trim().length === 0;
  const fieldError = failure?.fieldErrors?.body?.[0] as
    ValidationMessage | undefined;

  function send() {
    if (pending || empty) return;
    const data = new FormData();
    data.set("conversationId", conversationId);
    data.set("body", body);
    setFailure(undefined);
    startTransition(async () => {
      const result = await sendMessage(data);
      if (result.ok) {
        setBody("");
        onSent(result.data);
      } else {
        setFailure(result);
      }
      field.current?.focus();
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      send();
    }
  }

  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      {fieldError ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {tValidation(fieldError)}
        </p>
      ) : (
        <FormError failure={failure} />
      )}
      <div className="flex items-end gap-2">
        <Textarea
          ref={field}
          name="body"
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            if (failure) setFailure(undefined);
          }}
          onKeyDown={onKeyDown}
          readOnly={pending}
          maxLength={MESSAGE_MAX_LENGTH}
          rows={1}
          placeholder={t("placeholder")}
          aria-label={t("label")}
          aria-invalid={fieldError ? true : undefined}
          aria-errormessage={fieldError ? errorId : undefined}
          className="max-h-40 min-h-10 resize-none"
        />
        <Button
          type="submit"
          size="icon-lg"
          className="size-10"
          disabled={pending || empty}
          aria-label={pending ? t("sending") : t("send")}
        >
          {pending ? (
            <LoaderCircle className="animate-spin" aria-hidden />
          ) : (
            <SendHorizontal aria-hidden />
          )}
        </Button>
      </div>
      {body.length >= COUNTER_FROM && (
        <p
          className="text-right text-xs text-muted-foreground tabular-nums"
          data-testid="message-counter"
        >
          {/* Strings: number formatting would group the digits (F-30). */}
          {t("counter", {
            count: String(body.length),
            max: String(MESSAGE_MAX_LENGTH),
          })}
        </p>
      )}
    </form>
  );
}
