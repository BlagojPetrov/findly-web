// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createItem } from "@/actions/items";
import messages from "../../../messages/mk.json";
import { ItemForm, type ItemFormValues } from "./item-form";

vi.mock("@/actions/items", () => ({
  createItem: vi.fn(),
  updateItem: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: (props: object) => <a {...props} />,
}));
// Browser-only parts (uploads, Leaflet) are not needed here.
vi.mock("@/components/items/image-picker", () => ({ ImagePicker: () => null }));
vi.mock("@/components/map/location-picker", () => ({
  LocationPicker: () => null,
}));

// React only runs act() warnings-free with this flag.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const emptyValues: ItemFormValues = {
  type: null,
  title: "",
  description: "",
  categoryId: "",
  occurredOn: "",
  locationName: "",
  lat: "",
  lng: "",
};

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
  vi.mocked(createItem).mockReset();
});

function renderForm(initialValues: ItemFormValues = emptyValues) {
  act(() =>
    root.render(
      <NextIntlClientProvider locale="mk" messages={messages}>
        <ItemForm
          mode="create"
          userId="00000000-0000-4000-8000-00000000000a"
          itemId="10000000-0000-4000-8000-000000000001"
          categories={[{ id: 1, name: "Клучеви", icon: "key-round" }]}
          initialValues={initialValues}
          today="2026-09-28"
        />
      </NextIntlClientProvider>,
    ),
  );
  const form = container.querySelector("form")!;
  const radio = (value: "lost" | "found") =>
    form.querySelector<HTMLInputElement>(
      `input[name="type"][value="${value}"]`,
    )!;
  const submit = () => act(async () => form.requestSubmit());
  return { form, radio, submit };
}

const failure = {
  ok: false as const,
  error: "validation" as const,
  fieldErrors: { title: ["titleTooShort"] },
};

describe("ItemForm type choice (F-24)", () => {
  it("stays selected after a failed submit", async () => {
    vi.mocked(createItem).mockResolvedValue(failure);
    const { form, radio, submit } = renderForm();

    act(() => radio("found").click());
    await submit();

    expect(createItem).toHaveBeenCalledTimes(1);
    expect(radio("found").checked).toBe(true);
    expect(radio("lost").checked).toBe(false);
    expect(new FormData(form).get("type")).toBe("found");
  });

  it("stays selected after several failed submits and is resubmitted", async () => {
    vi.mocked(createItem).mockResolvedValue(failure);
    const { radio, submit } = renderForm();

    act(() => radio("lost").click());
    await submit();
    await submit();

    expect(radio("lost").checked).toBe(true);
    const lastFormData = vi.mocked(createItem).mock.calls.at(-1)![0];
    expect(lastFormData.get("type")).toBe("lost");
  });

  it("keeps a choice changed after a failed submit", async () => {
    vi.mocked(createItem).mockResolvedValue(failure);
    const { radio, submit } = renderForm();

    act(() => radio("lost").click());
    await submit();
    act(() => radio("found").click());
    await submit();

    expect(radio("found").checked).toBe(true);
    expect(radio("lost").checked).toBe(false);
    expect(vi.mocked(createItem).mock.calls[1][0].get("type")).toBe("found");
  });

  it("keeps the initial type of an item being edited", async () => {
    vi.mocked(createItem).mockResolvedValue(failure);
    const { radio, submit } = renderForm({ ...emptyValues, type: "lost" });

    expect(radio("lost").checked).toBe(true);
    await submit();
    expect(radio("lost").checked).toBe(true);
  });
});
