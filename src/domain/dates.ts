import type { ISODate } from "./types";

const DAY_MS = 86_400_000;
/** First Monday after the Unix epoch. Weeks and fortnights are counted from here. */
export const EPOCH_MONDAY: ISODate = "1970-01-05";

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseISODate(s: ISODate): { y: number; m: number; d: number } {
  const m = ISO_RE.exec(s);
  if (!m) throw new Error(`Not an ISO date: ${s}`);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function fromYMD(y: number, m: number, d: number): ISODate {
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Days since the Unix epoch, treating the date as a plain calendar date. */
function toDayNumber(s: ISODate): number {
  const { y, m, d } = parseISODate(s);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

function fromDayNumber(n: number): ISODate {
  const dt = new Date(n * DAY_MS);
  return fromYMD(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addDays(s: ISODate, n: number): ISODate {
  return fromDayNumber(toDayNumber(s) + n);
}

/** Whole days from a to b. Positive when b is after a. */
export function daysBetween(a: ISODate, b: ISODate): number {
  return toDayNumber(b) - toDayNumber(a);
}

/** 0 = Monday … 6 = Sunday. */
export function dayOfWeek(s: ISODate): number {
  const { y, m, d } = parseISODate(s);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function daysSinceEpochMonday(s: ISODate): number {
  return daysBetween(EPOCH_MONDAY, s);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

let todayOverride: ISODate | null = null;

/** Development only: pretend today is another date. Pass null to clear. */
export function setTodayOverride(date: ISODate | null): void {
  todayOverride = date;
}

export function getTodayOverride(): ISODate | null {
  return todayOverride;
}

/** Today's local calendar date from a JS Date (defaults to now), unless overridden. */
export function localToday(now: Date = new Date()): ISODate {
  if (todayOverride) return todayOverride;
  return fromYMD(now.getFullYear(), now.getMonth() + 1, now.getDate());
}
