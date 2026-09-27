import { DEFICIENCY_C, DEFICIENCY_DECAY, DEFICIENCY_X } from "../constants";
import { addDays, maxDate } from "./dates";
import { daysInPeriod, firstPeriodOnOrAfter } from "./periods";
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
 * Deficiency score for one dish as of `today`, accrued day by day.
 *
 * Every past day on which the dish was still outstanding (its period had
 * started and its repeats were not yet met) adds a slice of X: the full
 * slice when it was ordered and not done, C times the slice when it was not
 * ordered. The slice is repeats / days-in-period, so a weekly dish left
 * untouched all week reaches the same total as a daily dish skipped once,
 * and the score rises a little with each day of waiting. Each completion
 * multiplies the score by the decay factor. Today itself never counts.
 */
export function deficiencyScore(
  dish: Dish,
  snapshots: RuleSnapshot[],
  history: DishHistory,
  today: ISODate,
  params: DeficiencyParams = DEFAULT_PARAMS,
): number {
  if (dish.createdOn >= today) return 0;
  let score = 0;
  let cursor = dish.createdOn;

  while (cursor < today) {
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
    if (windowStart >= today) break;

    const slice = rule.repeats / daysInPeriod(period);
    let done = 0;
    for (let d = windowStart; d <= period.end && d < today; d = addDays(d, 1)) {
      if (history.completedDays.has(d)) {
        done++;
        score *= params.decay;
      } else if (done < rule.repeats) {
        score += slice * (history.orderedDays.has(d) ? params.x : params.c * params.x);
      }
    }

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
