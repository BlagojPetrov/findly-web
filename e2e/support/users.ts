import { expect, type Page } from "@playwright/test";
import { literal, sql } from "./db";

// Test accounts of one run. Only these patterns are ever deleted: the dev
// project also holds the owner's real accounts and the demo reporters.
export const E2E_EMAIL_PATTERNS = [
  "e2e-%@findly.test",
  "findly-e2e-%@mailinator.com",
];
export const PASSWORD = "E2e-Test-pass-2026";

export function runId() {
  const id = process.env.E2E_RUN_ID;
  if (!id) throw new Error("E2E_RUN_ID is not set (global setup did not run)");
  return id;
}

export function testEmail(role: string) {
  return `e2e-${runId()}-${role}@findly.test`;
}

// A confirmed email/password user, created directly in auth (no email is
// sent). The profile comes from the sign-up trigger.
export function createUser(email: string, displayName: string) {
  sql(`
    with u as (
      insert into auth.users (instance_id, id, aud, role, email,
        encrypted_password, email_confirmed_at, raw_app_meta_data,
        raw_user_meta_data, created_at, updated_at, confirmation_token,
        recovery_token, email_change_token_new, email_change,
        email_change_token_current, reauthentication_token, phone_change,
        phone_change_token)
      values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(),
        'authenticated', 'authenticated', ${literal(email)},
        extensions.crypt(${literal(PASSWORD)}, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('display_name', ${literal(displayName)}, 'locale', 'mk'),
        now(), now(), '', '', '', '', '', '', '', '')
      returning id, email
    )
    insert into auth.identities (id, user_id, provider_id, identity_data,
      provider, created_at, updated_at, last_sign_in_at)
    select gen_random_uuid(), id, id::text,
      jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
      'email', now(), now(), now()
    from u;
  `);
}

// Signs in through the email form (the Google button is a form of its own)
// and waits for the dashboard.
export async function signIn(page: Page, email: string) {
  await page.goto("/login");
  const form = page.locator('form:has(input[name="email"])');
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="password"]').fill(PASSWORD);
  await form.getByRole("button", { name: "Најави се" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
