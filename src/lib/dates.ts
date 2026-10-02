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

// How long ago something happened, for texts such as "5 minutes ago". The
// UI words it with translations instead of Intl.RelativeTimeFormat: browsers
// based on Chromium have no Macedonian data for it (F-30). After a week it is
// a calendar day in Macedonia. A time in the future (clock skew) is "now".
export type Elapsed =
  | { unit: "now" }
  | { unit: "minutes" | "hours" | "days"; count: number }
  | { unit: "date"; day: string; month: string; year: string };

export function elapsedSince(date: Date, now = new Date()): Elapsed {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return { unit: "now" };
  if (minutes < 60) return { unit: "minutes", count: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { unit: "hours", count: hours };
  const days = Math.floor(hours / 24);
  if (days < 7) return { unit: "days", count: days };
  const [year, month, day] = todayInAppTimeZone(date).split("-");
  // Strings, so message formatting does not group or localize the digits.
  return { unit: "date", day: String(+day), month: String(+month), year };
}

// The time of day in Macedonia as "HH:MM" (24-hour). en-GB only gives the
// digits, so it renders the same on the server and in every browser (F-30).
const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function clockTime(date: Date) {
  return clockFormat.format(date);
}

// The calendar day before a "YYYY-MM-DD" day.
export function previousDay(day: string) {
  return new Date(calendarDay(day).getTime() - 86_400_000)
    .toISOString()
    .slice(0, 10);
}
