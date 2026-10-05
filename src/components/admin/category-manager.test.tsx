// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
} from "@/actions/categories";
import type { AdminCategory } from "@/lib/queries/admin";
import mk from "../../../messages/mk.json";
import { CategoryManager, moved } from "./category-manager";

const { toast } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/actions/categories", () => ({
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  reorderCategories: vi.fn(),
}));
vi.mock("sonner", () => ({ toast }));

// React only runs act() warnings-free with this flag.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const t = mk.Admin.categories;
const done = { ok: true, data: undefined } as const;

const categories: AdminCategory[] = [
  {
    id: 1,
    slug: "electronics",
    nameMk: "Електроника",
    nameEn: "Electronics",
    icon: "smartphone",
    itemCount: 3,
  },
  {
    id: 9,
    slug: "bikes",
    nameMk: "Велосипеди",
    nameEn: "Bikes",
    icon: "bike",
    itemCount: 0,
  },
  {
    id: 8,
    slug: "other",
    nameMk: "Друго",
    nameEn: "Other",
    icon: "package",
    itemCount: 0,
  },
];

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
  document.body.innerHTML = "";
  for (const action of [
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
  ]) {
    vi.mocked(action).mockReset();
  }
  toast.success.mockReset();
  toast.error.mockReset();
});

function render() {
  act(() =>
    root.render(
      <NextIntlClientProvider locale="mk" messages={mk}>
        <CategoryManager categories={categories} locale="mk" />
      </NextIntlClientProvider>,
    ),
  );
}

const byLabel = (label: string) =>
  document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const button = (text: string, scope = "") =>
  [...document.querySelectorAll<HTMLButtonElement>(`${scope} button`)].find(
    (b) => b.textContent === text,
  );
const rowSlugs = () =>
  [...container.querySelectorAll("li[data-slug]")].map((li) =>
    li.getAttribute("data-slug"),
  );
const dialogForm = () =>
  document.querySelector<HTMLFormElement>('[role="dialog"] form')!;
function fill(name: string, value: string) {
  const input = dialogForm().querySelector<HTMLInputElement>(
    `[name="${name}"]`,
  )!;
  input.value = value;
}

describe("moved", () => {
  it("swaps with the neighbour and stays inside the list", () => {
    expect(moved([1, 2, 3], 1, -1)).toEqual([2, 1, 3]);
    expect(moved([1, 2, 3], 1, 1)).toEqual([1, 3, 2]);
    expect(moved([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(moved([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
  });
});

describe("CategoryManager", () => {
  it("lists the categories with names, slugs and usage", () => {
    render();
    expect(rowSlugs()).toEqual(["electronics", "bikes", "other"]);
    const text = container.textContent!;
    expect(text).toContain("3 категории");
    expect(text).toContain("Електроника / Electronics");
    expect(text).toContain("3 пријави");
    expect(text).toContain("не се користи");
    expect(text).toContain(t.protected);
    expect(byLabel("Помести ја „Електроника“ нагоре").disabled).toBe(true);
    expect(byLabel("Помести ја „Друго“ надолу").disabled).toBe(true);
  });

  it("allows deleting only unused categories other than “other”", () => {
    render();
    expect(byLabel("Избриши „Електроника“").disabled).toBe(true);
    expect(byLabel("Избриши „Друго“").disabled).toBe(true);
    expect(byLabel("Избриши „Велосипеди“").disabled).toBe(false);
  });

  it("sends the full new order when moving a category", async () => {
    let resolve!: (value: typeof done) => void;
    vi.mocked(reorderCategories).mockReturnValue(
      new Promise((r) => (resolve = r)),
    );
    render();
    await act(async () => byLabel("Помести ја „Велосипеди“ нагоре").click());
    // Shown at once, while the action runs.
    expect(rowSlugs()).toEqual(["bikes", "electronics", "other"]);
    const data = vi.mocked(reorderCategories).mock.calls[0][0];
    expect(data.getAll("ids")).toEqual(["9", "1", "8"]);
    await act(async () => resolve(done));
  });

  it("shows a refused reorder and returns to the saved order", async () => {
    vi.mocked(reorderCategories).mockResolvedValue({
      ok: false,
      error: "category_list_changed",
    });
    render();
    await act(async () => byLabel("Помести ја „Велосипеди“ надолу").click());
    expect(toast.error).toHaveBeenCalledWith(mk.Errors.category_list_changed);
    expect(rowSlugs()).toEqual(["electronics", "bikes", "other"]);
  });

  it("deletes after a confirmation", async () => {
    vi.mocked(deleteCategory).mockResolvedValue(done);
    render();
    await act(async () => byLabel("Избриши „Велосипеди“").click());
    expect(deleteCategory).not.toHaveBeenCalled();
    await act(async () =>
      button(t.confirmDelete, '[role="alertdialog"]')!.click(),
    );
    expect(vi.mocked(deleteCategory).mock.calls[0][0].get("id")).toBe("9");
    expect(toast.success).toHaveBeenCalledWith("„Велосипеди“ е избришана.");
  });

  it("adds a category and keeps the values after an error", async () => {
    vi.mocked(createCategory).mockResolvedValueOnce({
      ok: false,
      error: "category_slug_taken",
    });
    render();
    await act(async () => button(t.add)!.click());
    fill("slug", "bikes");
    fill("nameMk", "Велосипеди");
    fill("nameEn", "Bikes");
    dialogForm()
      .querySelector<HTMLInputElement>('input[value="bike"]')!
      .click();
    await act(async () => dialogForm().requestSubmit());
    const data = vi.mocked(createCategory).mock.calls[0][0];
    expect(Object.fromEntries(data)).toEqual({
      slug: "bikes",
      nameMk: "Велосипеди",
      nameEn: "Bikes",
      icon: "bike",
    });
    expect(dialogForm().textContent).toContain(mk.Errors.category_slug_taken);
    expect(
      dialogForm().querySelector<HTMLInputElement>('[name="slug"]')!.value,
    ).toBe("bikes");
    expect(
      dialogForm().querySelector<HTMLInputElement>('input[value="bike"]')!
        .checked,
    ).toBe(true);

    vi.mocked(createCategory).mockResolvedValueOnce(done);
    fill("slug", "bicycles");
    await act(async () => dialogForm().requestSubmit());
    expect(toast.success).toHaveBeenCalledWith(t.createdToast);
    expect(document.querySelector('[role="dialog"] form')).toBeNull();
  });

  it("edits names and icon without the slug", async () => {
    vi.mocked(updateCategory).mockResolvedValue(done);
    render();
    await act(async () => byLabel("Уреди „Електроника“").click());
    expect(dialogForm().querySelector('[name="slug"]')).toBeNull();
    expect(dialogForm().textContent).toContain("electronics");
    expect(
      dialogForm().querySelector<HTMLInputElement>('input[value="smartphone"]')!
        .checked,
    ).toBe(true);
    fill("nameEn", "Electronic devices");
    await act(async () => dialogForm().requestSubmit());
    expect(
      Object.fromEntries(vi.mocked(updateCategory).mock.calls[0][0]),
    ).toEqual({
      id: "1",
      nameMk: "Електроника",
      nameEn: "Electronic devices",
      icon: "smartphone",
    });
    expect(toast.success).toHaveBeenCalledWith(t.updatedToast);
  });
});
