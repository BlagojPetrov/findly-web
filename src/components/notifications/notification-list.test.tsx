// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import {
  deleteNotification,
  markAllNotificationsRead,
  setNotificationRead,
} from "@/actions/notifications";
import type { ActionResult } from "@/lib/action-result";
import {
  NOTIFICATIONS_CHANGED_EVENT,
  NOTIFICATIONS_RECEIVED_EVENT,
  type NotificationView,
} from "@/lib/notifications";
import en from "../../../messages/en.json";
import mk from "../../../messages/mk.json";
import { NotificationList } from "./notification-list";

const { refresh, toast } = vi.hoisted(() => ({
  refresh: vi.fn(),
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/actions/notifications", () => ({
  setNotificationRead: vi.fn(),
  deleteNotification: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh }),
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));
vi.mock("sonner", () => ({ toast }));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function view(
  id: string,
  overrides: Partial<NotificationView> = {},
): NotificationView {
  return {
    id: `56000000-0000-4000-8000-0000000000${id}`,
    type: "match",
    read: false,
    createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    item: {
      id: "10000000-0000-4000-8000-000000000001",
      type: "lost",
      status: "active",
      title: "Изгубени клучеви",
    },
    otherItem: {
      id: "20000000-0000-4000-8000-000000000001",
      type: "found",
      status: "active",
      title: `Најдени клучеви ${id}`,
    },
    matchStatus: "suggested",
    ...overrides,
  };
}

const views = [view("01"), view("02"), view("03", { read: true })];

// A promise the test resolves itself, to look at the optimistic state.
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

let container: HTMLDivElement;
let root: Root;
let changed: Mock<() => void>;

beforeEach(() => {
  vi.mocked(setNotificationRead).mockReset();
  vi.mocked(deleteNotification).mockReset();
  vi.mocked(markAllNotificationsRead).mockReset();
  refresh.mockReset();
  toast.error.mockReset();
  toast.success.mockReset();
  changed = vi.fn<() => void>();
  window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, changed);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, changed);
});

function render(
  props: Parameters<typeof NotificationList>[0] = {
    views,
    unread: 2,
    total: 3,
  },
  locale: "mk" | "en" = "mk",
) {
  act(() =>
    root.render(
      <NextIntlClientProvider
        locale={locale}
        messages={locale === "mk" ? mk : en}
        timeZone="Europe/Skopje"
      >
        <NotificationList {...props} />
      </NextIntlClientProvider>,
    ),
  );
}

const text = () => container.textContent ?? "";
const entries = () => [...container.querySelectorAll("li")];
const readStates = () => entries().map((li) => li.dataset.read);

function button(label: string, index = 0) {
  const found = [...container.querySelectorAll("button")].filter(
    (b) => b.getAttribute("aria-label") === label || b.textContent === label,
  );
  if (!found[index]) throw new Error(`No button "${label}"`);
  return found[index];
}

describe("NotificationList", () => {
  it("shows the entries and the summary in Macedonian", () => {
    render();
    expect(entries()).toHaveLength(3);
    expect(text()).toContain("3 известувања · 2 непрочитани");
    expect(text()).toContain("Најдени клучеви 01");
    expect(text()).toContain("пред 2 часа");
    expect(container.querySelector("ul")?.getAttribute("aria-label")).toBe(
      "Известувања",
    );
  });

  it("shows the summary in English", () => {
    render({ views, unread: 1, total: 21 }, "en");
    expect(text()).toContain("21 notifications · 1 unread");
    expect(text()).toContain("Mark all as read");
    expect(text()).toContain("2 hours ago");
  });

  it("marks a notification read at once, then shows the server's page", async () => {
    const action = deferred<ActionResult>();
    vi.mocked(setNotificationRead).mockReturnValue(action.promise);
    render();
    act(() => button("Означи како прочитано").click());
    expect(readStates()).toEqual(["true", "false", "true"]);
    expect(text()).toContain("1 непрочитано");
    const data = vi.mocked(setNotificationRead).mock.calls[0][0];
    expect(data.get("notificationId")).toBe(views[0].id);
    expect(data.get("read")).toBe("true");

    // The action's refresh() delivers the new page together with its result.
    await act(async () => {
      render({
        views: [view("01", { read: true }), views[1], views[2]],
        unread: 1,
        total: 3,
      });
      action.resolve({ ok: true, data: undefined });
    });
    expect(readStates()).toEqual(["true", "false", "true"]);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("marks a read notification unread", async () => {
    vi.mocked(setNotificationRead).mockResolvedValue({
      ok: true,
      data: undefined,
    });
    render();
    await act(async () => button("Означи како непрочитано").click());
    expect(vi.mocked(setNotificationRead).mock.calls[0][0].get("read")).toBe(
      "false",
    );
  });

  it("undoes a failed change and shows the error", async () => {
    const action = deferred<ActionResult>();
    vi.mocked(setNotificationRead).mockReturnValue(action.promise);
    render();
    act(() => button("Означи како прочитано").click());
    expect(readStates()[0]).toBe("true");
    await act(async () => action.resolve({ ok: false, error: "forbidden" }));
    expect(readStates()).toEqual(["false", "false", "true"]);
    expect(text()).toContain("2 непрочитани");
    expect(toast.error).toHaveBeenCalledWith("Немате дозвола за оваа акција.");
  });

  it("removes a deleted notification at once", async () => {
    const action = deferred<ActionResult>();
    vi.mocked(deleteNotification).mockReturnValue(action.promise);
    render();
    act(() => button("Избриши известување", 1).click());
    expect(entries()).toHaveLength(2);
    expect(text()).not.toContain("Најдени клучеви 02");
    expect(text()).toContain("1 непрочитано");
    expect(
      vi.mocked(deleteNotification).mock.calls[0][0].get("notificationId"),
    ).toBe(views[1].id);
    await act(async () => action.resolve({ ok: true, data: undefined }));
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it("marks all as read", async () => {
    const action = deferred<ActionResult<{ count: number }>>();
    vi.mocked(markAllNotificationsRead).mockReturnValue(action.promise);
    render();
    act(() => button("Означи ги сите како прочитани").click());
    expect(readStates()).toEqual(["true", "true", "true"]);
    expect(text()).toContain("сите се прочитани");
    expect(button("Означи ги сите како прочитани").disabled).toBe(true);
    await act(async () => action.resolve({ ok: true, data: { count: 2 } }));
    expect(toast.success).toHaveBeenCalledWith(
      "2 известувања се означени како прочитани.",
    );
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it("disables mark all read without unread notifications", () => {
    render({ views: [view("01", { read: true })], unread: 0, total: 1 });
    expect(button("Означи ги сите како прочитани").disabled).toBe(true);
  });

  it("marks an unread notification read when its link is followed", async () => {
    vi.mocked(setNotificationRead).mockResolvedValue({
      ok: true,
      data: undefined,
    });
    render();
    const links = [...container.querySelectorAll("a")];
    for (const link of links) {
      link.addEventListener("click", (event) => event.preventDefault());
    }
    await act(async () => links[2].click());
    expect(setNotificationRead).not.toHaveBeenCalled();
    await act(async () => links[0].click());
    expect(setNotificationRead).toHaveBeenCalledTimes(1);
    expect(links[0].getAttribute("href")).toBe(
      "/items/10000000-0000-4000-8000-000000000001#matches-item",
    );
  });

  it("refreshes when the bell receives new notifications", () => {
    render();
    act(() => {
      window.dispatchEvent(new Event(NOTIFICATIONS_RECEIVED_EVENT));
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
    root = createRoot(container);
    window.dispatchEvent(new Event(NOTIFICATIONS_RECEIVED_EVENT));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
