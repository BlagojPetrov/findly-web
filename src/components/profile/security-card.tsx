"use client";

import { KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { GoogleLogo } from "@/components/auth/google-logo";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import {
  SettingsCard,
  SettingsCardBody,
} from "@/components/profile/settings-card";
import { Button } from "@/components/ui/button";

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground">
      {children}
    </div>
  );
}

// "Security" card. Accounts with an email identity can open the password
// form; Google-only accounts have no password and only see a note.
export function SecurityCard({ hasPassword }: { hasPassword: boolean }) {
  const t = useTranslations("Profile");
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    // The button is rendered again after this update; give it focus back.
    requestAnimationFrame(() => buttonRef.current?.focus());
  }

  if (!hasPassword) {
    return (
      <SettingsCard title={t("securityTitle")}>
        <SettingsCardBody className="flex items-center gap-4">
          <IconBox>
            <GoogleLogo className="size-5" />
          </IconBox>
          <div className="min-w-0">
            <p className="text-sm font-medium">{t("googleOnlyTitle")}</p>
            <p className="text-sm text-muted-foreground">
              {t("passwordGoogleOnly")}
            </p>
          </div>
        </SettingsCardBody>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard title={t("securityTitle")}>
      <SettingsCardBody className="grid gap-5">
        <div className="flex flex-wrap items-center gap-4">
          <IconBox>
            <KeyRound className="size-5" aria-hidden />
          </IconBox>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t("password")}</p>
            <p
              className="text-sm tracking-[0.12em] text-muted-foreground"
              aria-hidden
            >
              ••••••••••
            </p>
          </div>
          {!open && (
            <Button
              ref={buttonRef}
              type="button"
              variant="outline"
              aria-expanded={false}
              aria-controls="change-password"
              onClick={() => setOpen(true)}
            >
              {t("passwordButton")}
            </Button>
          )}
        </div>
        {open && (
          <div id="change-password" className="border-t pt-5">
            <ChangePasswordForm onDone={close} onCancel={close} />
          </div>
        )}
      </SettingsCardBody>
    </SettingsCard>
  );
}
