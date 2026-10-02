// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { MESSAGES_CHANGED_EVENT } from "@/lib/chat";
import { RefreshOnMessages } from "./refresh-on-messages";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh }) }));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("RefreshOnMessages", () => {
  it("re-renders the page when messages changed, until unmounted", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => root.render(<RefreshOnMessages />));
    expect(container.innerHTML).toBe("");
    act(() => {
      window.dispatchEvent(new Event(MESSAGES_CHANGED_EVENT));
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
    window.dispatchEvent(new Event(MESSAGES_CHANGED_EVENT));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
