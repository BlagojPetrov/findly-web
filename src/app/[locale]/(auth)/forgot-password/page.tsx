import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/forgot-password">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Auth",
  });
  return { title: t("forgotTitle") };
}

// Also shown when a password reset link failed (?error=link_invalid, from
// /api/auth/confirm).
export default async function ForgotPasswordPage({
  params,
  searchParams,
}: PageProps<"/[locale]/forgot-password">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("Auth");

  const linkInvalid = (await searchParams).error === "link_invalid";

  return (
    <AuthCard
      title={linkInvalid ? t("resetLinkInvalidTitle") : t("forgotTitle")}
      description={linkInvalid ? undefined : t("forgotDescription")}
      footer={
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          {t("backToLogin")}
        </Link>
      }
    >
      <div className="grid gap-5">
        {linkInvalid && (
          <div
            role="alert"
            className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{t("resetLinkInvalid")}</p>
          </div>
        )}
        <ForgotPasswordForm />
      </div>
    </AuthCard>
  );
}
