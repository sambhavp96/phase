/**
 * Dates are stored and passed around as plain "YYYY-MM-DD" strings (Postgres `date`).
 * All arithmetic is done in UTC so time zones and daylight saving never shift a day.
 */
export type ISODate = string;

const DAY_MS = 86_400_000;

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function parts(iso: ISODate): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

function toUTCms(iso: ISODate): number {
  const [y, m, d] = parts(iso);
  return Date.UTC(y, m - 1, d);
}

export function makeISO(year: number, month0: number, day: number): ISODate {
  return `${year}-${pad(month0 + 1)}-${pad(day)}`;
}

/** The calendar date of a JS Date in the phone's local time zone. */
export function toISODate(date: Date): ISODate {
  return makeISO(date.getFullYear(), date.getMonth(), date.getDate());
}

/** A local JS Date (midday, to stay clear of DST edges) for pickers. */
export function fromISODate(iso: ISODate): Date {
  const [y, m, d] = parts(iso);
  return new Date(y, m - 1, d, 12);
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toUTCms(b) - toUTCms(a)) / DAY_MS);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const t = new Date(toUTCms(iso) + days * DAY_MS);
  return makeISO(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}

/** "15 Nov", or "15 Nov 2026". */
export function formatDate(iso: ISODate, withYear = false): string {
  const [y, m, d] = parts(iso);
  return `${d} ${MONTHS_SHORT[m - 1]}${withYear ? ` ${y}` : ''}`;
}

/** "13 to 17 Nov", "28 Oct to 2 Nov". */
export function formatRange(start: ISODate, end: ISODate): string {
  if (start === end) return formatDate(start);
  const [, sm, sd] = parts(start);
  const [, em] = parts(end);
  return sm === em ? `${sd} to ${formatDate(end)}` : `${formatDate(start)} to ${formatDate(end)}`;
}

/** Days of a month as a 7-column grid starting on Sunday; `null` pads the first week. */
export function monthGrid(year: number, month0: number): (ISODate | null)[] {
  const offset = new Date(year, month0, 1).getDay();
  const count = new Date(year, month0 + 1, 0).getDate();
  const cells: (ISODate | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= count; d++) cells.push(makeISO(year, month0, d));
  return cells;
}
