import type { Metadata } from "next";

// Auth pages have no value in search results.
export const metadata: Metadata = {
  robots: { index: false },
};

export default function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-12 sm:py-16">
      {children}
    </div>
  );
}
