// @vitest-environment jsdom
import { createTranslator } from "next-intl";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { BannedNotice } from "./banned-notice";

const { getCurrentUser } = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ getCurrentUser }));
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) =>
    createTranslator({
      locale: "en",
      messages: en,
      namespace: namespace as "Moderation.banned",
    }),
}));

// React only runs act() warnings-free with this flag.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  getCurrentUser.mockReset();
});

// Server Component: await it, then render the element it returns.
async function render() {
  const element = await BannedNotice();
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => root.render(element));
  return container;
}

describe("BannedNotice", () => {
  it("tells a banned user what they can still do", async () => {
    getCurrentUser.mockResolvedValue({ profile: { is_banned: true } });
    const container = await render();
    const notice = container.querySelector('[role="status"]')!;
    expect(notice.textContent).toContain(en.Moderation.banned.title);
    expect(notice.textContent).toContain(en.Moderation.banned.body);
  });

  it("shows nothing to guests and other users", async () => {
    getCurrentUser.mockResolvedValue(null);
    expect(await BannedNotice()).toBeNull();
    getCurrentUser.mockResolvedValue({ profile: { is_banned: false } });
    expect(await BannedNotice()).toBeNull();
  });
});
