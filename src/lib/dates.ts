// Date helpers working on "YYYY-MM-DD" strings in UTC (DB columns are @db.Date).

const DAY_MS = 86_400_000;

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseISODate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

export function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseISODate(s).getTime());
}

export function addDays(s: string, days: number): string {
  return toISODate(new Date(parseISODate(s).getTime() + days * DAY_MS));
}

/** Inclusive number of days from a to b. */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / DAY_MS) + 1;
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Today's date in Estonia (Europe/Tallinn). */
export function todayTallinn(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Tallinn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function yesterdayTallinn(): string {
  return addDays(todayTallinn(), -1);
}

export function monthOf(s: string): string {
  return s.slice(0, 7);
}

export function monthStart(month: string): string {
  return `${month}-01`;
}

export function monthEnd(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return toISODate(new Date(Date.UTC(y, m, 0)));
}

export function daysInMonth(month: string): number {
  return Number(monthEnd(month).slice(8, 10));
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return toISODate(d).slice(0, 7);
}

/** Months touched by the inclusive range, with the number of days of the range in each month. */
export function monthsInRange(from: string, to: string): { month: string; days: number }[] {
  const out: { month: string; days: number }[] = [];
  for (let m = monthOf(from); m <= monthOf(to); m = addMonths(m, 1)) {
    const start = monthStart(m) > from ? monthStart(m) : from;
    const end = monthEnd(m) < to ? monthEnd(m) : to;
    out.push({ month: m, days: daysBetween(start, end) });
  }
  return out;
}

/** Overlap of two inclusive ranges, or null. */
export function overlap(aFrom: string, aTo: string, bFrom: string, bTo: string): [string, string] | null {
  const from = aFrom > bFrom ? aFrom : bFrom;
  const to = aTo < bTo ? aTo : bTo;
  return from <= to ? [from, to] : null;
}

export function formatDateLabel(s: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(parseISODate(s));
}

export function formatMonthLabel(month: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    parseISODate(monthStart(month)),
  );
}
