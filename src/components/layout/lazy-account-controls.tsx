"use client";

import dynamic from "next/dynamic";

// `next/dynamic` must be called in a Client Component to split client code
// (a Server Component's dynamic import still bundles it with the layout).
// Rendered on the server as usual; the chunk loads only when it renders, i.e.
// for signed-in users (P11.S5).
export const LazyAccountControls = dynamic(() =>
  import("./account-controls").then((mod) => mod.AccountControls),
);
