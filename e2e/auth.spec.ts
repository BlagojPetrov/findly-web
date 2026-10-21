import { expect, test } from "@playwright/test";
import { literal, sql } from "./support/db";
import { PASSWORD, runId } from "./support/users";

// Sign-up → email confirmation → sign-out → sign-in. The sign-up sends a real
// email (custom SMTP), so it goes to a disposable inbox; the confirmation
// link's token is read from the database instead of the email.

test("register, confirm the email, sign out and sign in again", async ({
  page,
}) => {
  const email = `findly-e2e-${runId()}@mailinator.com`;

  await page.goto("/register");
  await page.locator('input[name="displayName"]').fill("E2E Регистрација");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.locator('input[name="confirmPassword"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Регистрирај се" }).click();
  await expect(page).toHaveURL(/\/verify-email\?email=/);
  await expect(
    page.getByRole("heading", { name: "Проверете ја е-поштата" }),
  ).toBeVisible();

  // Signed out until the link is opened.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);

  const [{ token_hash }] = sql<{ token_hash: string }>(`
    select t.token_hash from auth.one_time_tokens t
      join auth.users u on u.id = t.user_id
     where u.email = ${literal(email)} and t.token_type = 'confirmation_token';
  `);
  await page.goto(
    `/api/auth/confirm?token_hash=${token_hash}&type=email&locale=mk`,
  );
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Мои пријави" }),
  ).toBeVisible();

  // The same link cannot be used twice.
  await page.goto(
    `/api/auth/confirm?token_hash=${token_hash}&type=email&locale=mk`,
  );
  await expect(page).toHaveURL(/\/verify-email\?error=link_invalid$/);

  await page.getByRole("button", { name: "Кориснички профил" }).click();
  await page.getByRole("menuitem", { name: "Одјави се" }).click();
  await expect(page.getByRole("link", { name: "Најава" })).toBeVisible();

  await page.goto("/login");
  const form = page.locator('form:has(input[name="email"])');
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="password"]').fill("wrong-password-1");
  await form.getByRole("button", { name: "Најави се" }).click();
  await expect(form.getByRole("alert")).toContainText(
    "Погрешна е-пошта или лозинка.",
  );
  // The email stays filled in after a failed attempt.
  await expect(form.locator('input[name="email"]')).toHaveValue(email);

  await form.locator('input[name="password"]').fill(PASSWORD);
  await form.getByRole("button", { name: "Најави се" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
