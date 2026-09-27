import {
  addDays,
  dayOfWeek,
  daysBetween,
  daysInMonth,
  daysSinceEpochMonday,
  EPOCH_MONDAY,
  fromYMD,
  parseISODate,
} from "./dates";
import type { Cadence, ISODate, Period } from "./types";

export const MAX_REPEATS: Record<Cadence, number> = {
  daily: 1,
  weekdays: 5,
  weekends: 2,
  weekly: 7,
  biweekly: 14,
  monthly: 28,
  quarterly: 90,
  halfyearly: 180,
  yearly: 365,
};

export const CADENCE_LABEL: Record<Cadence, string> = {
  daily: "Daily",
  weekdays: "Weekdays",
  weekends: "Weekends",
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  halfyearly: "Half-yearly",
  yearly: "Yearly",
};

/** Noun for "times per …" labels. */
export const CADENCE_PERIOD_NOUN: Record<Cadence, string> = {
  daily: "day",
  weekdays: "week",
  weekends: "weekend",
  weekly: "week",
  biweekly: "fortnight",
  monthly: "month",
  quarterly: "quarter",
  halfyearly: "half-year",
  yearly: "year",
};

function mondayOf(date: ISODate): ISODate {
  return addDays(date, -dayOfWeek(date));
}

/**
 * The period of the given cadence that contains the date, or null when the date
 * falls outside every period of that cadence (a weekday for "weekends", a weekend for "weekdays").
 */
export function periodFor(cadence: Cadence, date: ISODate): Period | null {
  const { y, m } = parseISODate(date);
  const dow = dayOfWeek(date);
  switch (cadence) {
    case "daily":
      return { start: date, end: date };
    case "weekdays": {
      if (dow > 4) return null;
      const mon = mondayOf(date);
      return { start: mon, end: addDays(mon, 4) };
    }
    case "weekends": {
      if (dow < 5) return null;
      const sat = addDays(date, 5 - dow);
      return { start: sat, end: addDays(sat, 1) };
    }
    case "weekly": {
      const mon = mondayOf(date);
      return { start: mon, end: addDays(mon, 6) };
    }
    case "biweekly": {
      const idx = Math.floor(daysSinceEpochMonday(date) / 14);
      const start = addDays(EPOCH_MONDAY, idx * 14);
      return { start, end: addDays(start, 13) };
    }
    case "monthly":
      return { start: fromYMD(y, m, 1), end: fromYMD(y, m, daysInMonth(y, m)) };
    case "quarterly": {
      const qm = Math.floor((m - 1) / 3) * 3 + 1;
      return { start: fromYMD(y, qm, 1), end: fromYMD(y, qm + 2, daysInMonth(y, qm + 2)) };
    }
    case "halfyearly":
      return m <= 6
        ? { start: fromYMD(y, 1, 1), end: fromYMD(y, 6, 30) }
        : { start: fromYMD(y, 7, 1), end: fromYMD(y, 12, 31) };
    case "yearly":
      return { start: fromYMD(y, 1, 1), end: fromYMD(y, 12, 31) };
  }
}

/** The first period of the cadence that contains the date or starts after it. */
export function firstPeriodOnOrAfter(cadence: Cadence, date: ISODate): Period {
  let d = date;
  for (let i = 0; i < 7; i++) {
    const p = periodFor(cadence, d);
    if (p) return p;
    d = addDays(d, 1);
  }
  throw new Error(`No period of ${cadence} near ${date}`);
}

export function nextPeriod(cadence: Cadence, period: Period): Period {
  return firstPeriodOnOrAfter(cadence, addDays(period.end, 1));
}

export function daysInPeriod(period: Period): number {
  return daysBetween(period.start, period.end) + 1;
}

export function periodContains(period: Period, date: ISODate): boolean {
  return date >= period.start && date <= period.end;
}
