// Dates such as "when was the item lost" are calendar days in Macedonia,
// whatever the time zone of the server (UTC on Vercel) or the database.
export const APP_TIME_ZONE = "Europe/Skopje";

// Today's date in Macedonia as "YYYY-MM-DD" (the format of <input
// type="date"> and Postgres dates). The database trigger on items uses the
// same rule, so both reject the same "future" dates.
export function todayInAppTimeZone(now = new Date()) {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// A "YYYY-MM-DD" calendar day as a Date at midnight UTC. Format it with
// timeZone "UTC" so the day never shifts.
export function calendarDay(date: string) {
  return new Date(`${date}T00:00:00Z`);
}
