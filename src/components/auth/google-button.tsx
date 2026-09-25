"use client";

import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { signInWithGoogle } from "@/actions/auth";
import { FormError } from "@/components/forms/form-error";
import { GoogleLogo } from "@/components/auth/google-logo";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

// "Continue with Google" for the login and register pages. On success the
// action redirects to Google, so the state only ever holds an error.
export function GoogleButton({ next }: { next?: string }) {
  const t = useTranslations("Auth");
  const [result, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) =>
      signInWithGoogle(formData),
    null,
  );
  const failure = result && !result.ok ? result : undefined;

  return (
    <form action={formAction} className="grid gap-3">
      {next && <input type="hidden" name="next" value={next} />}
      <FormError failure={failure} />
      <Button type="submit" variant="outline" size="lg" disabled={pending}>
        {pending ? (
          <LoaderCircle className="animate-spin" aria-hidden />
        ) : (
          <GoogleLogo />
        )}
        {t("continueWithGoogle")}
      </Button>
    </form>
  );
}
