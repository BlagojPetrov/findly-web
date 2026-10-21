import { checkNoEffectOnRealUsers, deleteTestUsers } from "./support/cleanup";

// Checks that the run touched no real user, then deletes its accounts (also
// after a failed run).
export default function globalTeardown() {
  const startedAt = process.env.E2E_STARTED_AT;
  const effects = startedAt
    ? checkNoEffectOnRealUsers(startedAt)
    : { notifications: 0, matches: 0 };
  deleteTestUsers();
  if (effects.notifications > 0 || effects.matches > 0) {
    throw new Error(
      `The run affected real users: ${effects.notifications} notifications, ${effects.matches} matches with test reports`,
    );
  }
}
