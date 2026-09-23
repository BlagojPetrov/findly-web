import { notFound } from "next/navigation";

// Sends unknown URLs to [locale]/not-found.tsx so the 404 page is translated
// and rendered inside the site layout.
export default function CatchAllPage() {
  notFound();
}
