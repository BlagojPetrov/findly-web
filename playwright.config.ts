import { defineConfig } from "@playwright/test";

// End-to-end tests (P11.S6) against a local production build: run
// `npm run build` first, then `npm run test:e2e`. The app talks to the linked
// dev Supabase project, so the tests create their own users (`e2e-…@findly.test`,
// one `findly-e2e-…@mailinator.com` sign-up) with the Supabase CLI and delete
// them afterwards (e2e/global-setup.ts, e2e/global-teardown.ts). Not run in CI:
// CI has no database access.
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "e2e",
  // One worker: the tests share one database and its rate limits.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Installed Edge by default (no browser download); E2E_CHANNEL=chromium
    // uses Playwright's own build (`npx playwright install chromium`).
    channel: process.env.E2E_CHANNEL ?? "msedge",
    // Macedonian is the default locale; the browser language must not
    // redirect to English (F-13).
    locale: "mk-MK",
    timezoneId: "Europe/Skopje",
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
    launchOptions: {
      // Two users in two windows: the window in the background must keep its
      // timers, or Realtime updates arrive late.
      args: [
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
      ],
    },
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
