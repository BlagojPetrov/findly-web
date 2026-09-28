"use client";

import { Component, type ReactNode } from "react";

// Shows `fallback` instead of a map that failed (its code did not load, or
// Leaflet threw), so the rest of the page keeps working.
export class MapErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Map failed:", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
