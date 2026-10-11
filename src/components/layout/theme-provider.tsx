"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

// Light, dark or the system's choice, stored in localStorage ("theme") and
// applied as the `dark` class on <html>. next-themes renders an inline script
// that sets the class before the first paint (no flash). React warns in
// development about a <script> rendered on the client; as text/plain there it
// is inert, and the server's copy already ran (Next.js "Preventing Flash").
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      scriptProps={{
        type: typeof window === "undefined" ? "text/javascript" : "text/plain",
      }}
    >
      {children}
    </NextThemesProvider>
  );
}
