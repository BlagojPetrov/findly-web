export type PageItem = number | "gap";

// The `?page=` parameter of a paged list: "2" and up; anything else
// (missing, "1", "abc", repeated) is page 1, and the page redirects to its
// canonical URL.
export function parsePage(value: string | string[] | undefined) {
  return typeof value === "string" && /^[1-9]\d{0,5}$/.test(value)
    ? Number(value)
    : 1;
}

// Number of pages for `total` results (at least 1, so an empty result is
// "page 1 of 1").
export function pageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}

// Page numbers to show in a pagination bar: always the first and last page
// and `siblings` pages on each side of the current one, with "gap" where
// pages are left out. A gap never hides a single page (that page is shown
// instead), so the bar keeps the same length while moving through the pages.
export function pageItems(
  current: number,
  totalPages: number,
  siblings = 1,
): PageItem[] {
  // first + last + current + siblings on both sides + two gaps
  const slots = 2 * siblings + 5;
  if (totalPages <= slots) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const page = Math.min(Math.max(current, 1), totalPages);
  // Near either end the window grows towards that end, so there is only one
  // gap (a gap there would hide a single page).
  let start = page - siblings;
  let end = page + siblings;
  if (start <= 3) {
    start = 2;
    end = slots - 2;
  } else if (end >= totalPages - 2) {
    start = totalPages - slots + 3;
    end = totalPages - 1;
  }

  const items: PageItem[] = [1];
  if (start > 2) items.push("gap");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < totalPages - 1) items.push("gap");
  items.push(totalPages);
  return items;
}
