import { sql } from "./db";
import { E2E_EMAIL_PATTERNS } from "./users";

const isTestUser = (column: string) =>
  E2E_EMAIL_PATTERNS.map((pattern) => `${column} like '${pattern}'`).join(
    " or ",
  );

// Deletes every E2E account; their profiles, reports, matches, conversations,
// messages and notifications go with them (foreign keys cascade). The tests
// upload no photos, so there is nothing to remove from Storage.
export function deleteTestUsers() {
  sql(`delete from auth.users where ${isTestUser("email")};`);
  const [{ count }] = sql<{ count: number }>(
    `select count(*)::int as count from auth.users where ${isTestUser("email")};`,
  );
  if (count !== 0) throw new Error(`${count} E2E users left after cleanup`);
}

// Things the tests must never cause: notifications for real users and
// matches between a test report and someone else's report.
export function checkNoEffectOnRealUsers(since: string) {
  const [{ notifications, matches }] = sql<{
    notifications: number;
    matches: number;
  }>(`
    select
      (select count(*)::int from public.notifications n
         join auth.users u on u.id = n.user_id
        where n.created_at >= '${since}' and not (${isTestUser("u.email")}))
        as notifications,
      (select count(*)::int from public.matches m
         join public.items l on l.id = m.lost_item_id
         join public.items f on f.id = m.found_item_id
         join auth.users lu on lu.id = l.user_id
         join auth.users fu on fu.id = f.user_id
        where (${isTestUser("lu.email")}) <> (${isTestUser("fu.email")}))
        as matches;
  `);
  return { notifications, matches };
}
