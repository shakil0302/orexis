/** Calendar date in local time, formatted YYYY-MM-DD. */
export type ISODate = string;

export const CADENCES = [
  "daily",
  "weekdays",
  "weekends",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "halfyearly",
  "yearly",
] as const;
export type Cadence = (typeof CADENCES)[number];

export interface Category {
  id: string;
  name: string;
  position: number;
}

export interface Dish {
  id: string;
  categoryId: string;
  name: string;
  durationMin: number;
  cadence: Cadence;
  repeats: number;
  createdOn: ISODate;
  deletedOn: ISODate | null;
}

export interface Rule {
  cadence: Cadence;
  repeats: number;
}

/**
 * The rule that was in force for a period that was already under way when the
 * dish was edited. Keyed by the start of that period.
 */
export interface RuleSnapshot extends Rule {
  dishId: string;
  periodStart: ISODate;
}

export interface Order {
  day: ISODate;
  placedAt: string;
}

export interface OrderItem {
  day: ISODate;
  dishId: string;
}

export interface Completion {
  day: ISODate;
  dishId: string;
  doneAt: string;
}

/** Inclusive date range. */
export interface Period {
  start: ISODate;
  end: ISODate;
}
