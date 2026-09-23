import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
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

// Shown after registration. The resend button is added in P2.S5.
export default async function VerifyEmailPage({
  params,
  searchParams,
}: PageProps<"/[locale]/verify-email">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("Auth");

  // Only display the address if it really is one (it comes from the URL).
  const email = emailSchema.safeParse((await searchParams).email);

  return (
    <AuthCard
      title={t("verifyTitle")}
      description={
        email.success
          ? t("verifyDescription", { email: email.data })
          : t("verifyDescriptionNoEmail")
      }
    >
      <div className="grid gap-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          <MailCheck className="size-5 shrink-0 text-primary" aria-hidden />
          <p>{t("verifySpamHint")}</p>
        </div>
        <Link href="/login" className={buttonVariants({ variant: "outline" })}>
          {t("backToLogin")}
        </Link>
      </div>
    </AuthCard>
  );
}
