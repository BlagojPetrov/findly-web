import { expect, test } from "@playwright/test";

// Public pages as a guest: search, feed filters in the URL, the map view,
// an item page, the language switch, protected routes and the feed without
// JavaScript. Reads only; nothing is written to the database.

test("home search opens the feed with the query", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("паричник");
  await page.getByRole("button", { name: "Пребарај" }).click();
  await expect(page).toHaveURL(/\/items\?q=%D0%BF/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Изгубени и пронајдени предмети",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Пребарување" }),
  ).toHaveValue("паричник");
});

test("type filter goes to the canonical URL and filters the cards", async ({
  page,
}) => {
  await page.goto("/items");
  await page.locator('label:has(input[name="type"][value="lost"])').click();
  await page.getByRole("button", { name: "Примени филтри" }).click();
  await expect(page).toHaveURL(/\/items\?type=lost$/);
  const cards = page.locator("article");
  await expect(cards.first()).toBeVisible();
  for (const card of await cards.all()) {
    await expect(card.getByText("Изгубено", { exact: true })).toBeVisible();
  }
});

test("map view shows markers and /map redirects to it", async ({ page }) => {
  await page.goto("/items");
  await page.getByRole("link", { name: "Карта" }).click();
  await expect(page).toHaveURL(/\/items\?view=map$/);
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();

  await page.goto("/map");
  await expect(page).toHaveURL(/\/items\?view=map$/);
});

test("item page opens from the feed with its details and map", async ({
  page,
}) => {
  await page.goto("/items");
  const link = page.locator("article h3 a").first();
  const title = (await link.innerText()).trim();
  await link.click();
  await expect(page).toHaveURL(/\/items\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  const map = page.getByRole("region", { name: /^Карта: каде/ });
  await map.scrollIntoViewIfNeeded();
  await expect(map.locator(".leaflet-marker-icon")).toBeVisible();
});

test("language switch keeps the page and its filters", async ({ page }) => {
  await page.goto("/items?type=found");
  await page
    .getByRole("navigation", { name: "Јазик" })
    .locator('a[href^="/en/"]')
    .click();
  await expect(page).toHaveURL(/\/en\/items\?type=found$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Lost and found items" }),
  ).toBeVisible();
});

test("protected pages send guests to sign-in and back", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
});

test("unknown report answers 404", async ({ page }) => {
  const response = await page.goto(
    "/items/00000000-0000-4000-8000-000000000000",
  );
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Страницата не е пронајдена")).toBeVisible();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the feed redirects a submitted form to its canonical URL", async ({
    page,
  }) => {
    await page.goto("/items?q=&type=lost&category=&from=&to=");
    await expect(page).toHaveURL(/\/items\?type=lost$/);
    await expect(page.locator("article").first()).toBeVisible();
  });

  test("the filter form submits as a plain GET form", async ({ page }) => {
    await page.goto("/items");
    await page.locator('label:has(input[name="type"][value="found"])').click();
    await page.getByRole("button", { name: "Примени филтри" }).click();
    await expect(page).toHaveURL(/\/items\?type=found$/);
  });
});
