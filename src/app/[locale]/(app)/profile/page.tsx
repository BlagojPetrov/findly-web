import { Mail } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GoogleLogo } from "@/components/auth/google-logo";
import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileHeader } from "@/components/profile/profile-header";
import { SecurityCard } from "@/components/profile/security-card";
import {
  SettingsCard,
  SettingsCardBody,
} from "@/components/profile/settings-card";
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

const providerIcons = {
  email: <Mail className="size-3.5 text-muted-foreground" aria-hidden />,
  google: <GoogleLogo className="size-3.5" />,
};
const knownProviders = Object.keys(providerIcons) as Array<
  keyof typeof providerIcons
>;

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

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <ProfileHeader
        userId={user.id}
        displayName={profile.display_name}
        email={user.email}
        avatarPath={profile.avatar_path}
      />

      <ProfileForm
        initialValues={{
          displayName: profile.display_name,
          preferredLocale: profile.preferred_locale,
        }}
      />

      <SettingsCard title={t("accountTitle")}>
        <SettingsCardBody className="py-2">
          <dl className="divide-y text-sm">
            <div className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:items-center sm:gap-4">
              <dt className="text-muted-foreground">{t("email")}</dt>
              <dd className="font-medium break-all">{user.email ?? "—"}</dd>
            </div>
            <div className="grid gap-1.5 py-3 sm:grid-cols-[11rem_1fr] sm:items-center sm:gap-4">
              <dt className="text-muted-foreground">{t("signInMethod")}</dt>
              <dd className="flex flex-wrap gap-2">
                {providers.length === 0 && "—"}
                {providers.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium"
                  >
                    {providerIcons[p]}
                    {t(`providers.${p}`)}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </SettingsCardBody>
      </SettingsCard>

      {/* Only accounts with an email identity have a password to change. */}
      <SecurityCard hasPassword={user.providers.includes("email")} />
    </div>
  );
}
