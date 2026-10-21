import { expect, test } from "@playwright/test";
import { literal, sql } from "./support/db";
import { createUser, signIn, testEmail } from "./support/users";

// The main scenario: the owner reports a lost item through the form, a
// matching found report appears (created with SQL, as if by the finder), the
// owner sees the match and its notification, the finder contacts the owner,
// both chat (Realtime), and the owner marks the report resolved.
//
// Reports are documents in Skopje with made-up words in the title: real found
// documents are more than 50 km away and no real text is similar, so no real
// report can become a match (the teardown checks this).

const LOST_TITLE = "E2E тетратка со сини корици зебрафон";
const FOUND_TITLE = "Пронајдена тетратка со сини корици зебрафон";

// Today's date in Skopje, as the form expects it (YYYY-MM-DD).
function todayInSkopje() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Skopje",
  }).format(new Date());
}

test("report → match → contact → chat → resolved", async ({
  page,
  browser,
  baseURL,
}) => {
  const ownerEmail = testEmail("owner");
  const finderEmail = testEmail("finder");
  createUser(ownerEmail, "E2E Сопственик");
  createUser(finderEmail, "E2E Наоѓач");

  let itemId = "";
  await test.step("owner reports a lost item", async () => {
    await signIn(page, ownerEmail);
    await page.goto("/items/new");
    await page.getByText("Изгубив нешто").click();
    await page.locator('input[name="title"]').fill(LOST_TITLE);
    await page
      .locator('textarea[name="description"]')
      .fill("Тетратка со сини корици и налепница зебрафон на предната страна.");
    await page
      .locator('label:has(input[name="categoryId"])', { hasText: "Документи" })
      .click();
    await page.locator('input[name="occurredOn"]').fill(todayInSkopje());

    // A point on the picker map (Skopje), then the address it looked up is
    // replaced with a fixed one.
    const map = page.getByRole("region", {
      name: "Карта за избор на локација",
    });
    await map.locator(".leaflet-container").click();
    await expect(page.locator('input[name="lat"]')).not.toHaveValue("");
    await expect(page.getByText("Се бара адресата…")).toBeHidden();
    await page.locator('input[name="locationName"]').fill("E2E, Скопје");

    await page.getByRole("button", { name: "Објави пријава" }).click();
    await expect(page).toHaveURL(/\/items\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      LOST_TITLE,
    );
    itemId = page.url().split("/").pop()!;
  });

  await test.step("a matching found report appears", async () => {
    sql(`
      insert into public.items (user_id, type, title, description,
        category_id, occurred_on, location_name, location, search_text)
      select (select id from auth.users where email = ${literal(finderEmail)}),
        'found', ${literal(FOUND_TITLE)},
        'Најдов тетратка со сини корици и налепница зебрафон.',
        lost.category_id, lost.occurred_on, lost.location_name, lost.location, ''
      from public.items lost where lost.id = ${literal(itemId)};
    `);
    const [{ count }] = sql<{ count: number }>(`
      select count(*)::int as count from public.matches
       where lost_item_id = ${literal(itemId)};
    `);
    expect(count).toBe(1);
  });

  await test.step("the owner sees the match and its notification", async () => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("button", { name: /^Известувања, 1 непрочитано/ }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: FOUND_TITLE })).toBeVisible();

    await page.goto(`/items/${itemId}`);
    await expect(
      page.getByRole("heading", { name: "Можни совпаѓања" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: FOUND_TITLE })).toBeVisible();
  });

  const finderContext = await browser.newContext({
    baseURL,
    locale: "mk-MK",
    timezoneId: "Europe/Skopje",
    viewport: { width: 1280, height: 900 },
  });
  const finder = await finderContext.newPage();
  try {
    await test.step("the finder contacts the owner", async () => {
      await signIn(finder, finderEmail);
      await finder.goto(`/items/${itemId}`);
      await finder.getByRole("button", { name: "Контактирај" }).click();
      await expect(finder).toHaveURL(/\/messages\/[0-9a-f-]{36}$/);
      await finder
        .getByRole("textbox", { name: "Порака" })
        .fill("Здраво, мислам дека ја најдов вашата тетратка.");
      await finder.getByRole("button", { name: "Испрати" }).click();
      await expect(finder.locator('li[data-own="true"]')).toContainText(
        "мислам дека ја најдов",
      );
    });

    await test.step("the owner reads it and replies in real time", async () => {
      await page.goto("/messages");
      const row = page.getByRole("listitem").filter({ hasText: "E2E Наоѓач" });
      await expect(row).toContainText("мислам дека ја најдов");
      await row.getByRole("link", { name: "E2E Наоѓач" }).click();
      await expect(page.locator('li[data-own="false"]')).toContainText(
        "мислам дека ја најдов",
      );

      await page
        .getByRole("textbox", { name: "Порака" })
        .fill("Да, моја е! Благодарам.");
      await page.getByRole("button", { name: "Испрати" }).click();
      await expect(page.locator('li[data-own="true"]')).toContainText(
        "Благодарам",
      );
      // The finder's open chat receives it without a reload.
      await expect(finder.locator('li[data-own="false"]')).toContainText(
        "Благодарам",
      );
    });
  } finally {
    await finderContext.close();
  }

  await test.step("the owner marks the report resolved", async () => {
    await page.goto(`/items/${itemId}`);
    await page.getByRole("button", { name: "Означи како решено" }).click();
    await expect(
      page.getByText("Пријавата е означена како решена."),
    ).toBeVisible();
    await expect(
      page.getByText("Решено", { exact: true }).first(),
    ).toBeVisible();
    const [{ status }] = sql<{ status: string }>(
      `select status::text from public.items where id = ${literal(itemId)};`,
    );
    expect(status).toBe("resolved");
  });
});
