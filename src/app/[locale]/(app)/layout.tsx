import type { Metadata } from "next";

// Pages for signed-in users. Each page checks the user itself with
// requireUser() (layouts do not re-run on navigation); the proxy only
// redirects guests optimistically.
export const metadata: Metadata = {
  robots: { index: false },
};

export default function AppLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      {children}
    </div>
  );
}
