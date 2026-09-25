import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { AvatarForm } from "@/components/profile/avatar-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { ProfileForm } from "@/components/profile/profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/profile">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Profile",
  });
  return { title: t("title") };
}

const knownProviders = ["email", "google"] as const;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="font-semibold">{title}</h2>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function ProfilePage({
  params,
}: PageProps<"/[locale]/profile">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [user, t] = await Promise.all([
    requireUser("/profile"),
    getTranslations("Profile"),
  ]);
  const { profile } = user;
  const providers = knownProviders.filter((p) => user.providers.includes(p));
  // Only accounts with an email identity have a password to change.
  const hasPassword = user.providers.includes("email");

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Section title={t("avatarTitle")} description={t("avatarHint")}>
        <AvatarForm
          userId={user.id}
          displayName={profile.display_name}
          avatarPath={profile.avatar_path}
        />
      </Section>

      <Section title={t("detailsTitle")}>
        <ProfileForm
          initialValues={{
            displayName: profile.display_name,
            preferredLocale: profile.preferred_locale,
          }}
        />
      </Section>

      <Section title={t("accountTitle")}>
        <dl className="grid gap-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
          <dt className="text-muted-foreground">{t("email")}</dt>
          <dd className="break-all">{user.email ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("signInMethods")}</dt>
          <dd>{providers.map((p) => t(`providers.${p}`)).join(", ") || "—"}</dd>
        </dl>
      </Section>

      <Section
        title={t("passwordTitle")}
        description={hasPassword ? t("passwordDescription") : undefined}
      >
        {hasPassword ? (
          <ChangePasswordForm />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("passwordGoogleOnly")}
          </p>
        )}
      </Section>
    </div>
  );
}
