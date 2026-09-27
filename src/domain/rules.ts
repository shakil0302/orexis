import { periodContains, periodFor } from "./periods";
import type { Dish, ISODate, Rule, RuleSnapshot } from "./types";

/**
 * The cadence and repeats that apply to the dish on the given date.
 * A snapshot wins when its period contains the date; otherwise the dish's current rule applies.
 */
export function ruleInForce(dish: Dish, snapshots: RuleSnapshot[], date: ISODate): Rule {
  for (const s of snapshots) {
    if (s.dishId !== dish.id) continue;
    const p = periodFor(s.cadence, s.periodStart);
    if (p && periodContains(p, date)) return { cadence: s.cadence, repeats: s.repeats };
  }
  return { cadence: dish.cadence, repeats: dish.repeats };
}

export function sameRule(a: Rule, b: Rule): boolean {
  return a.cadence === b.cadence && a.repeats === b.repeats;
}

/**
 * The first day that belongs to the rule in force on `date`, never earlier than
 * the dish's creation. Days before it were governed by an earlier snapshot.
 */
export function ruleWindowStart(dish: Dish, snapshots: RuleSnapshot[], date: ISODate): ISODate {
  let start = dish.createdOn;
  for (const s of snapshots) {
    if (s.dishId !== dish.id) continue;
    const p = periodFor(s.cadence, s.periodStart);
    if (!p || p.end >= date) continue;
    const dayAfter = nextDay(p.end);
    if (dayAfter > start) start = dayAfter;
  }
  return start;
}

function nextDay(d: ISODate): ISODate {
  // Local import to avoid a cycle through periods -> dates in some bundlers.
  const { addDays } = require("./dates") as typeof import("./dates");
  return addDays(d, 1);
}
