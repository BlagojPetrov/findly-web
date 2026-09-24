import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { GoogleButton } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";
import { Link } from "@/i18n/navigation";
import { safeRedirectPath } from "@/lib/safe-redirect";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Auth",
  });
  return { title: t("loginTitle") };
}

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("Auth");

  const { next, error } = await searchParams;
  const safeNext =
    typeof next === "string" ? safeRedirectPath(next, "") : undefined;
  // Set by /api/auth/callback when Google sign-in did not complete.
  const oauthError =
    error === "oauth_cancelled"
      ? t("oauthCancelled")
      : error === "oauth_failed"
        ? t("oauthFailed")
        : undefined;

  return (
    <AuthCard
      title={t("loginTitle")}
      description={t("loginDescription")}
      footer={
        <p>
          {t("noAccount")}{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            {t("createAccount")}
          </Link>
        </p>
      }
    >
      <div className="grid gap-5">
        {oauthError && (
          <div
            role="alert"
            className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{oauthError}</p>
          </div>
        )}
        <GoogleButton next={safeNext || undefined} />
        <AuthDivider label={t("or")} />
        <LoginForm next={safeNext || undefined} />
      </div>
    </AuthCard>
  );
}
