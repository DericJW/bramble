/**
 * Date helpers that work in the phone's local time. Dates picked by the user are stored at
 * local noon so that a small timezone change never moves an expense to another day.
 */

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAYS_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function atNoon(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Add whole months, keeping the day of month where possible (31 Jan + 1 month → 28/29 Feb). */
export function addMonths(d: Date, n: number): Date {
  const y = d.getFullYear();
  const m = d.getMonth() + n;
  const target = new Date(y, m, 1, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  const dim = daysInMonth(target.getFullYear(), target.getMonth());
  target.setDate(Math.min(d.getDate(), dim));
  return target;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
  return r;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / DAY_MS);
}

/** Whole calendar months from `from` to `to`, ignoring the day of month. */
export function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

/** "2026-10" */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** "2026-10" → 1 Oct 2026 00:00 local. Falls back to the current month for bad input. */
export function monthFromKey(key: string): Date {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return startOfMonth(new Date());
  return new Date(Number(m[1]), Number(m[2]) - 1, 1);
}

/** "2026-10-16" */
export function dayKey(d: Date): string {
  return `${monthKey(d)}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "16 Oct" */
export function formatShortDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "31 Mar 2027" */
export function formatLongDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "16 Oct", or "16 Oct 2025" when the year differs from `now`. */
export function formatSmartDate(d: Date, now: Date = new Date()): string {
  return d.getFullYear() === now.getFullYear() ? formatShortDate(d) : formatLongDate(d);
}

/** "October 2026" */
export function formatMonthYear(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Jun 2029" */
export function formatShortMonthYear(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Fri · 16 October" */
export function formatHeaderDate(d: Date): string {
  return `${WEEKDAYS_SHORT[d.getDay()]} · ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Wed, 28 Oct" */
export function formatWeekdayDate(d: Date): string {
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "Today", "Yesterday", "Tomorrow" or "Mon, 12 Oct". */
export function relativeDay(d: Date, now: Date = new Date()): string {
  const diff = daysBetween(now, d);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  const label = formatWeekdayDate(d);
  return d.getFullYear() === now.getFullYear() ? label : `${label} ${d.getFullYear()}`;
}

/** "Today, 16 Oct" style label for date rows. */
export function dateRowLabel(d: Date, now: Date = new Date()): string {
  const diff = daysBetween(now, d);
  if (diff === 0) return `Today, ${formatShortDate(d)}`;
  if (diff === -1) return `Yesterday, ${formatShortDate(d)}`;
  return formatSmartDate(d, now) === formatShortDate(d) ? formatWeekdayDate(d) : formatLongDate(d);
}

/** "Due today", "Due in 12 days", "Overdue by 3 days"... */
export function dueText(days: number): string {
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days > 1) return `Due in ${days} days`;
  if (days === -1) return 'Overdue by 1 day';
  return `Overdue by ${-days} days`;
}

/** "in 12 days", "today", "3 days ago" */
export function inDaysText(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 1) return `in ${days} days`;
  if (days === -1) return 'yesterday';
  return `${-days} days ago`;
}

export function greeting(d: Date): string {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** The farm goes to sleep at 7pm and wakes up at 6am. */
export function isNightTime(d: Date): boolean {
  const h = d.getHours();
  return h >= 19 || h < 6;
}

/** 1st, 2nd, 3rd, 28th... */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** Calendar grid for a month: weeks of 7 cells, null for days outside the month. Weeks start on Monday. */
export function monthGrid(month: Date): (Date | null)[][] {
  const y = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(y, m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday = 0
  const total = daysInMonth(y, m);
  const cells: (Date | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let day = 1; day <= total; day++) cells.push(new Date(y, m, day, 12));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
