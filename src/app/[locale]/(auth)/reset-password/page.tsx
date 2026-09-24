import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/reset-password">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Auth",
  });
  return { title: t("resetTitle") };
}

// Landing page of the password reset link: /api/auth/confirm has already
// signed the user in. Without a session (link not opened, or signed out)
// there is nothing to reset, so the page points back to /forgot-password.
export default async function ResetPasswordPage({
  params,
}: PageProps<"/[locale]/reset-password">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("Auth");
  const user = await getCurrentUser();

  if (!user) {
    return (
      <AuthCard
        title={t("resetNoSessionTitle")}
        description={t("resetNoSession")}
      >
        <Link href="/forgot-password" className={buttonVariants()}>
          {t("requestNewLink")}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("resetTitle")}
      description={
        user.email ? t("resetDescription", { email: user.email }) : undefined
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
