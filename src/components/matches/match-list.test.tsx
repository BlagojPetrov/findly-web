// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setMatchStatus } from "@/actions/matches";
import type { MatchView } from "@/lib/matches";
import type { MatchItem } from "@/lib/queries/matches";
import en from "../../../messages/en.json";
import mk from "../../../messages/mk.json";
import { MatchList } from "./match-list";

const { refresh, toast } = vi.hoisted(() => ({
  refresh: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/actions/matches", () => ({ setMatchStatus: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh }),
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));
vi.mock("sonner", () => ({ toast }));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const viewer = "00000000-0000-4000-8000-00000000000a";

function matchItem(overrides: Partial<MatchItem>): MatchItem {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    user_id: viewer,
    type: "lost",
    status: "active",
    title: "Изгубени клучеви",
    occurred_on: "2026-09-20",
    location_name: "Градски парк",
    created_at: "2026-09-20T10:00:00Z",
    category: {
      id: 4,
      slug: "keys",
      name_mk: "Клучеви",
      name_en: "Keys",
      icon: "key-round",
    },
    coverPath: null,
    ...overrides,
  };
}

const own = matchItem({});

function match(
  id: string,
  overrides: Partial<MatchView<MatchItem>> = {},
): MatchView<MatchItem> {
  return {
    id,
    status: "suggested",
    score: 0.905,
    breakdown: {
      category: 1,
      distance_km: 1,
      days_between: 1,
      text: 0.857,
      shared_words: ["crn", "dalecinski", "kluca"],
    },
    updatedAt: "2026-09-30T10:00:00Z",
    own,
    other: matchItem({
      id: `20000000-0000-4000-8000-0000000000${id.slice(-2)}`,
      user_id: "00000000-0000-4000-8000-00000000000b",
      type: "found",
      title: `Најдени клучеви ${id}`,
      location_name: "Кеј на Вардар",
    }),
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.mocked(setMatchStatus).mockReset();
  refresh.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
});

function render(
  props: Parameters<typeof MatchList>[0],
  locale: "mk" | "en" = "mk",
) {
  act(() =>
    root.render(
      <NextIntlClientProvider
        locale={locale}
        messages={locale === "mk" ? mk : en}
        timeZone="Europe/Skopje"
      >
        <MatchList {...props} />
      </NextIntlClientProvider>,
    ),
  );
  return container;
}

const text = () => container.textContent?.replace(/\s+/g, " ") ?? "";

function button(label: string) {
  const found = [...container.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === label,
  );
  if (!found) throw new Error(`No button "${label}"`);
  return found;
}

describe("MatchList", () => {
  it("explains a match in Macedonian", () => {
    render({
      context: "item",
      matches: { suggested: [match("m01")], confirmed: [], dismissed: [] },
    });
    expect(text()).toContain("Можни совпаѓања");
    expect(text()).toContain("Најдени клучеви m01");
    expect(text()).toContain("Кеј на Вардар");
    expect(text()).toContain("Силно совпаѓање");
    expect(text()).toMatch(/·\s?91\s?%/);
    expect(text()).toContain("Иста категорија");
    expect(text()).toMatch(/На растојание од 1 (km|км)/);
    expect(text()).toContain("1 ден разлика");
    expect(text()).toContain("Заеднички зборови: crn, dalecinski и kluca");
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "/items/20000000-0000-4000-8000-000000000001",
    );
  });

  it("explains a match in English", () => {
    render(
      {
        context: "item",
        matches: {
          suggested: [
            match("m01", {
              score: 0.62,
              breakdown: {
                category: 0.5,
                distance_km: 0.3,
                days_between: 0,
                text: 0.08,
                shared_words: [],
              },
            }),
            match("m02", {
              score: 0.74,
              breakdown: {
                days_between: 12,
                shared_words: ["a1", "a2", "a3", "a4", "a5", "a6", "a7"],
              },
            }),
          ],
          confirmed: [],
          dismissed: [],
        },
      },
      "en",
    );
    expect(text()).toContain("Possible match·62%");
    expect(text()).toContain("Category “Other”, may be related");
    expect(text()).toContain("300 m apart");
    expect(text()).toContain("Same day");
    expect(text()).toContain("The descriptions have little in common");
    expect(text()).toContain("Good match·74%");
    expect(text()).toContain("12 days apart");
    expect(text()).toContain("Common words: a1, a2, a3, a4, a5 and 2 more");
  });

  it("does not repeat 'and' when words are left out (Macedonian)", () => {
    render({
      context: "item",
      matches: {
        suggested: [
          match("m01", {
            breakdown: { shared_words: ["a1", "a2", "a3", "a4", "a5", "a6"] },
          }),
        ],
        confirmed: [],
        dismissed: [],
      },
    });
    expect(text()).toContain("Заеднички зборови: a1, a2, a3, a4, a5 и уште 1");
  });

  it("does not show coordinates, only the place name", () => {
    render({
      context: "item",
      matches: { suggested: [match("m01")], confirmed: [], dismissed: [] },
    });
    expect(text()).not.toMatch(/\d+\.\d{3,}/);
  });

  it("shows empty states for the item page and the dashboard", () => {
    const empty = { suggested: [], confirmed: [], dismissed: [] };
    render({ context: "item", matches: empty }, "en");
    expect(text()).toContain("No matches yet.");
    render({ context: "dashboard", matches: empty }, "en");
    expect(text()).toContain("No matches for your active reports yet.");
    render({ context: "item", matches: empty, inactive: true }, "en");
    expect(text()).toContain(
      "Matches are only looked for while a report is active.",
    );
  });

  it("shows an error when matches could not be loaded", () => {
    render({ context: "dashboard", matches: null }, "en");
    expect(text()).toContain("Matches could not be loaded.");
    expect(container.querySelectorAll("article")).toHaveLength(0);
  });

  it("names the viewer's report on the dashboard only", () => {
    const matches = { suggested: [match("m01")], confirmed: [] };
    render({ context: "dashboard", matches }, "en");
    expect(text()).toContain("For your report: Изгубени клучеви");
    expect(
      container.querySelector(`a[href="/items/${own.id}"]`),
    ).not.toBeNull();
    render({ context: "item", matches: { ...matches, dismissed: [] } }, "en");
    expect(text()).not.toContain("For your report");
  });

  it("groups confirmed, suggested and dismissed matches", () => {
    render(
      {
        context: "item",
        matches: {
          suggested: [match("m01")],
          confirmed: [match("m02", { status: "confirmed" })],
          dismissed: [match("m03", { status: "dismissed" })],
        },
      },
      "en",
    );
    expect(text()).toContain("Confirmed");
    expect(text()).toContain("Suggested");
    expect(text()).toContain("You confirmed this match.");
    expect(container.querySelector("summary")?.textContent).toBe(
      "Dismissed (1)",
    );
    // Actions per status: suggested → confirm/dismiss, confirmed → undo,
    // dismissed → restore.
    expect(button("Confirm match")).toBeTruthy();
    expect(button("Not a match")).toBeTruthy();
    expect(button("Undo")).toBeTruthy();
    expect(button("Restore")).toBeTruthy();
  });
});

describe("MatchActions", () => {
  const suggested = {
    context: "item" as const,
    matches: { suggested: [match("m01")], confirmed: [], dismissed: [] },
  };

  function sentStatus(call = 0) {
    const data = vi.mocked(setMatchStatus).mock.calls[call][0];
    return { matchId: data.get("matchId"), status: data.get("status") };
  }

  it("confirms a match and refreshes the page", async () => {
    vi.mocked(setMatchStatus).mockResolvedValue({ ok: true, data: undefined });
    render(suggested, "en");
    await act(async () => button("Confirm match").click());
    expect(sentStatus()).toEqual({ matchId: "m01", status: "confirmed" });
    expect(refresh).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Match confirmed.");
  });

  it("dismisses a match with an undo in the toast", async () => {
    vi.mocked(setMatchStatus).mockResolvedValue({ ok: true, data: undefined });
    render(suggested, "en");
    await act(async () => button("Not a match").click());
    expect(sentStatus()).toEqual({ matchId: "m01", status: "dismissed" });
    const [message, options] = toast.success.mock.calls[0];
    expect(message).toBe("Match dismissed.");

    await act(async () => options.action.onClick());
    expect(sentStatus(1)).toEqual({ matchId: "m01", status: "suggested" });
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("restores a dismissed match", async () => {
    vi.mocked(setMatchStatus).mockResolvedValue({ ok: true, data: undefined });
    render(
      {
        context: "item",
        matches: {
          suggested: [],
          confirmed: [],
          dismissed: [match("m03", { status: "dismissed" })],
        },
      },
      "en",
    );
    await act(async () => button("Restore").click());
    expect(sentStatus()).toEqual({ matchId: "m03", status: "suggested" });
    expect(toast.success).toHaveBeenCalledWith(
      "Match moved back to the suggestions.",
    );
  });

  it("shows the error and does not refresh when the change fails", async () => {
    vi.mocked(setMatchStatus).mockResolvedValue({
      ok: false,
      error: "forbidden",
    });
    render(suggested, "en");
    await act(async () => button("Confirm match").click());
    expect(toast.error).toHaveBeenCalledWith(
      "You do not have permission to do this.",
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
