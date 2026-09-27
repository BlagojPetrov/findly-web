import type { Metadata } from "next";

// Pages for signed-in users. Each page checks the user itself with
// requireUser() (layouts do not re-run on navigation); the proxy only
// redirects guests optimistically. Pages set their own max width (forms are
// narrow, the dashboard is wide).
export const metadata: Metadata = {
  robots: { index: false },
};

export default function AppLayout({ children }: LayoutProps<"/[locale]">) {
  return <div className="w-full px-4 py-8 sm:py-12">{children}</div>;
}
