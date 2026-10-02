// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MESSAGES_CHANGED_EVENT, noteMessagesChanged } from "@/lib/chat";
import { RefreshOnMessages } from "./refresh-on-messages";

// The router's bfcacheId: a fresh visit gets a new one, the browser's
// Back/Forward buttons restore the same one (from the router cache).
const { refresh, router } = vi.hoisted(() => {
  const refresh = vi.fn();
  return { refresh, router: { bfcacheId: "", refresh } };
});
vi.mock("@/i18n/navigation", () => ({ useRouter: () => router }));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root | null = null;
let visits = 0;

// Shows the list: a fresh visit (new id) or the restored one (same id).
function show(bfcacheId: string) {
  router.bfcacheId = bfcacheId;
  root = createRoot(container);
  act(() => root!.render(<RefreshOnMessages />));
}
function leave() {
  act(() => root!.unmount());
  root = null;
}
function freshVisit() {
  const id = `_b_test_${++visits}_`;
  show(id);
  return id;
}

beforeEach(() => {
  refresh.mockReset();
  container = document.createElement("div");
});
afterEach(() => {
  if (root) leave();
});

describe("RefreshOnMessages", () => {
  it("re-renders the page when messages changed, until unmounted", () => {
    freshVisit();
    expect(container.innerHTML).toBe("");
    act(() => {
      window.dispatchEvent(new Event(MESSAGES_CHANGED_EVENT));
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    leave();
    window.dispatchEvent(new Event(MESSAGES_CHANGED_EVENT));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not re-render a fresh visit", () => {
    noteMessagesChanged();
    freshVisit();
    expect(refresh).not.toHaveBeenCalled();
  });

  // F-33: list → chat (read or sent there, all events handled while the list
  // was not mounted) → Back restores the list from the router cache.
  it("re-renders a list restored by Back when messages changed meanwhile", () => {
    const list = freshVisit();
    leave();
    // In the chat: messages read (or sent), the header's events handled.
    noteMessagesChanged();
    noteMessagesChanged();
    show(list);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not re-render a list restored by Back when nothing changed", () => {
    const list = freshVisit();
    leave();
    show(list);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("re-renders a restored list only once for the same changes", () => {
    const list = freshVisit();
    leave();
    noteMessagesChanged();
    show(list);
    leave();
    // Forward and Back again without new changes.
    show(list);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("counts changes it already re-rendered for while mounted", () => {
    const list = freshVisit();
    noteMessagesChanged();
    act(() => {
      window.dispatchEvent(new Event(MESSAGES_CHANGED_EVENT));
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    leave();
    show(list);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps each visit apart", () => {
    const first = freshVisit();
    leave();
    noteMessagesChanged();
    // A fresh visit after the change is current; the older one is not.
    const second = freshVisit();
    leave();
    show(second);
    expect(refresh).not.toHaveBeenCalled();
    leave();
    show(first);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
