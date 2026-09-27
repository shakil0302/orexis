import { DEFICIENCY_C, DEFICIENCY_DECAY, DEFICIENCY_X } from "../constants";
import { addDays, maxDate } from "./dates";
import { firstPeriodOnOrAfter } from "./periods";
import { ruleInForce, sameRule } from "./rules";
import type { Dish, ISODate, RuleSnapshot } from "./types";

export interface DeficiencyParams {
  x: number;
  c: number;
  decay: number;
}

export const DEFAULT_PARAMS: DeficiencyParams = {
  x: DEFICIENCY_X,
  c: DEFICIENCY_C,
  decay: DEFICIENCY_DECAY,
};

export interface DishHistory {
  /** Days on which the dish was part of the placed order. */
  orderedDays: Set<ISODate>;
  /** Days on which the dish was completed. */
  completedDays: Set<ISODate>;
}

/**
 * Deficiency score for one dish as of `today`, computed from every closed period
 * since the dish was created. The current, unfinished period does not count.
 */
export function deficiencyScore(
  dish: Dish,
  snapshots: RuleSnapshot[],
  history: DishHistory,
  today: ISODate,
  params: DeficiencyParams = DEFAULT_PARAMS,
): number {
  if (dish.createdOn > today) return 0;
  let score = 0;
  let cursor = dish.createdOn;

  for (;;) {
    let rule = ruleInForce(dish, snapshots, cursor);
    let period = firstPeriodOnOrAfter(rule.cadence, cursor);
    let windowStart = maxDate(period.start, cursor);
    // The rule may change at the start of the period we skipped forward to.
    const ruleAtStart = ruleInForce(dish, snapshots, windowStart);
    if (!sameRule(rule, ruleAtStart)) {
      rule = ruleAtStart;
      period = firstPeriodOnOrAfter(rule.cadence, windowStart);
      windowStart = maxDate(period.start, windowStart);
    }
    if (period.end >= today) break;

    let completed = 0;
    let orderedNotDone = 0;
    for (let d = windowStart; d <= period.end; d = addDays(d, 1)) {
      const done = history.completedDays.has(d);
      if (done) completed++;
      else if (history.orderedDays.has(d)) orderedNotDone++;
    }

    if (completed > 0) score *= params.decay;
    const shortfall = Math.max(0, rule.repeats - completed);
    const failed = Math.min(shortfall, orderedNotDone);
    score += failed * params.x + (shortfall - failed) * params.c * params.x;

    cursor = addDays(period.end, 1);
  }
  return score;
}

/** Scores for many dishes at once. Deleted dishes are skipped. */
export function deficiencyScores(
  dishes: Dish[],
  snapshots: RuleSnapshot[],
  orderedDaysByDish: Map<string, Set<ISODate>>,
  completedDaysByDish: Map<string, Set<ISODate>>,
  today: ISODate,
  params: DeficiencyParams = DEFAULT_PARAMS,
): Map<string, number> {
  const out = new Map<string, number>();
  const empty = new Set<ISODate>();
  for (const dish of dishes) {
    if (dish.deletedOn !== null) continue;
    out.set(
      dish.id,
      deficiencyScore(
        dish,
        snapshots,
        {
          orderedDays: orderedDaysByDish.get(dish.id) ?? empty,
          completedDays: completedDaysByDish.get(dish.id) ?? empty,
        },
        today,
        params,
      ),
    );
  }
  return out;
}
