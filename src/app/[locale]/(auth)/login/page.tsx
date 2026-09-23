import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
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

  const { next } = await searchParams;
  const safeNext =
    typeof next === "string" ? safeRedirectPath(next, "") : undefined;

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
      <LoginForm next={safeNext || undefined} />
    </AuthCard>
  );
}
