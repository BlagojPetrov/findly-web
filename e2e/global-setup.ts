import { deleteTestUsers } from "./support/cleanup";
import { sql } from "./support/db";

// Removes accounts left by an interrupted run and starts a new run. Values
// set on process.env here reach the tests and the teardown.
export default function globalSetup() {
  deleteTestUsers();
  const [{ now }] = sql<{ now: string }>("select now()::text as now;");
  process.env.E2E_STARTED_AT = now;
  process.env.E2E_RUN_ID = Date.now().toString(36);
}
