import { maxDate } from "./dates";
import { periodFor } from "./periods";
import { ruleInForce, ruleWindowStart } from "./rules";
import type { Completion, Dish, ISODate, Period, RuleSnapshot } from "./types";

export interface DishStatus {
  dish: Dish;
  period: Period;
  /** First day of the current period that counts toward this dish, after creation and rule changes. */
  windowStart: ISODate;
  done: number;
  repeats: number;
  doneToday: boolean;
}

/** Current-period status for every live dish whose cadence has a period containing the date. */
export function dishStatuses(
  dishes: Dish[],
  snapshots: RuleSnapshot[],
  completions: Completion[],
  date: ISODate,
): DishStatus[] {
  const out: DishStatus[] = [];
  for (const dish of dishes) {
    if (dish.deletedOn !== null) continue;
    if (dish.createdOn > date) continue;
    const rule = ruleInForce(dish, snapshots, date);
    const period = periodFor(rule.cadence, date);
    if (!period) continue;
    const windowStart = maxDate(period.start, ruleWindowStart(dish, snapshots, date));
    let done = 0;
    let doneToday = false;
    for (const c of completions) {
      if (c.dishId !== dish.id) continue;
      if (c.day < windowStart || c.day > period.end) continue;
      done++;
      if (c.day === date) doneToday = true;
    }
    out.push({ dish, period, windowStart, done, repeats: rule.repeats, doneToday });
  }
  return out;
}

/** Dishes that can be ordered on the date: repeats not exhausted and not already done today. */
export function availableDishes(
  dishes: Dish[],
  snapshots: RuleSnapshot[],
  completions: Completion[],
  date: ISODate,
): DishStatus[] {
  return dishStatuses(dishes, snapshots, completions, date).filter((s) => s.done < s.repeats && !s.doneToday);
}
