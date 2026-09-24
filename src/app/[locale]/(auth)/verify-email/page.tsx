import { MailCheck, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { ResendConfirmationForm } from "@/components/auth/resend-confirmation-form";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { emailSchema } from "@/lib/validation/auth";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/verify-email">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Auth",
  });
  return { title: t("verifyTitle") };
}

// Shown after registration (?email=…) and when a confirmation link failed
// (?error=link_invalid, from /api/auth/confirm).
export default async function VerifyEmailPage({
  params,
  searchParams,
}: PageProps<"/[locale]/verify-email">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("Auth");

  const query = await searchParams;
  const linkInvalid = query.error === "link_invalid";
  // Only display the address if it really is one (it comes from the URL).
  const email = emailSchema.safeParse(query.email);

  return (
    <AuthCard
      title={linkInvalid ? t("verifyLinkInvalidTitle") : t("verifyTitle")}
      description={
        linkInvalid
          ? undefined
          : email.success
            ? t("verifyDescription", { email: email.data })
            : t("verifyDescriptionNoEmail")
      }
    >
      <div className="grid gap-5">
        {linkInvalid ? (
          <div
            role="alert"
            className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{t("verifyLinkInvalid")}</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <MailCheck className="size-5 shrink-0 text-primary" aria-hidden />
            <p>{t("verifySpamHint")}</p>
          </div>
        )}
        <ResendConfirmationForm
          email={email.success ? email.data : undefined}
        />
        <Link href="/login" className={buttonVariants({ variant: "outline" })}>
          {t("backToLogin")}
        </Link>
      </div>
    </AuthCard>
  );
}
