"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import {
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

export const THEMES = ["light", "dark", "system"] as const;

const icons = { light: Sun, dark: Moon, system: Monitor };

// Theme choice inside the account menu. The menu renders only while open,
// i.e. after hydration, when next-themes knows the stored theme.
export function ThemeMenuGroup() {
  const t = useTranslations("Header");
  const { theme = "system", setTheme } = useTheme();

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>{t("theme")}</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={theme}
        onValueChange={(value) => setTheme(String(value))}
      >
        {THEMES.map((value) => {
          const Icon = icons[value];
          return (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon aria-hidden />
              {t(`themes.${value}`)}
            </DropdownMenuRadioItem>
          );
        })}
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  );
}
