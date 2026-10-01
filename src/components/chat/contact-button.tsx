"use client";

import { MessageCircle } from "lucide-react";
import { useActionState } from "react";
import { startConversation } from "@/actions/messages";
import { FormError } from "@/components/forms/form-error";
import { SubmitButton } from "@/components/forms/submit-button";
import type { ActionResult } from "@/lib/action-result";

// Starts (or opens) the user's conversation about a report. On success the
// action redirects to the chat; failures (limit, inactive report, …) are
// shown below the button.
export function ContactButton({
  itemId,
  label,
}: {
  itemId: string;
  label: string;
}) {
  const [result, formAction, pending] = useActionState(
    async (_prev: ActionResult<never> | null, formData: FormData) =>
      startConversation(formData),
    null,
  );

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="itemId" value={itemId} />
      <SubmitButton
        pending={pending}
        className="w-full sm:w-auto sm:justify-self-start"
      >
        {!pending && <MessageCircle aria-hidden />}
        {label}
      </SubmitButton>
      <FormError failure={result && !result.ok ? result : undefined} />
    </form>
  );
}
