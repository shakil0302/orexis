import { deficiencyScore, deficiencyScores, type DeficiencyParams } from "./deficiency";
import type { Dish, RuleSnapshot } from "./types";

const P: DeficiencyParams = { x: 1, c: 0.5, decay: 0.8 };

function dish(over: Partial<Dish> = {}): Dish {
  return {
    id: "d1",
    categoryId: "c1",
    name: "Gym",
    durationMin: 60,
    cadence: "daily",
    repeats: 1,
    createdOn: "2026-09-21", // Monday
    deletedOn: null,
    ...over,
  };
}

function hist(ordered: string[] = [], completed: string[] = []) {
  return { orderedDays: new Set(ordered), completedDays: new Set(completed) };
}

describe("deficiencyScore, daily cadence", () => {
  test("nothing closed yet gives zero", () => {
    expect(deficiencyScore(dish(), [], hist(), "2026-09-21", P)).toBe(0);
  });

  test("created in the future gives zero", () => {
    expect(deficiencyScore(dish({ createdOn: "2026-10-01" }), [], hist(), "2026-09-21", P)).toBe(0);
  });

  test("never ordered adds C times X per closed day", () => {
    // Mon, Tue closed as of Wed.
    expect(deficiencyScore(dish(), [], hist(), "2026-09-23", P)).toBeCloseTo(1.0);
  });

  test("ordered and skipped adds X per closed day", () => {
    expect(deficiencyScore(dish(), [], hist(["2026-09-21", "2026-09-22"]), "2026-09-23", P)).toBeCloseTo(2.0);
  });

  test("completed days add nothing and decay the score", () => {
    // Mon skipped after ordering (1.0), Tue done (decay to 0.8), Wed never ordered (+0.5).
    const h = hist(["2026-09-21", "2026-09-22"], ["2026-09-22"]);
    expect(deficiencyScore(dish(), [], h, "2026-09-24", P)).toBeCloseTo(1.3);
  });

  test("decay only applies on completion, not on skipped periods", () => {
    const h = hist(["2026-09-21"], []);
    // Mon: +1. Tue: +0.5. Wed: +0.5. No decay anywhere.
    expect(deficiencyScore(dish(), [], h, "2026-09-24", P)).toBeCloseTo(2.0);
  });
});

describe("deficiencyScore, repeats", () => {
  test("weekly x3 with one completion and one failed order", () => {
    const d = dish({ cadence: "weekly", repeats: 3 });
    // Ordered Mon (done), Wed (skipped). Shortfall 2: one failed-order unit (1.0) + one unordered (0.5).
    const h = hist(["2026-09-21", "2026-09-23"], ["2026-09-21"]);
    // Completed > 0 so decay runs first on 0, then add 1.5.
    expect(deficiencyScore(d, [], h, "2026-09-28", P)).toBeCloseTo(1.5);
  });

  test("failed orders beyond the shortfall are not charged", () => {
    const d = dish({ cadence: "weekly", repeats: 2 });
    // Done twice, ordered and skipped three other days. Shortfall 0.
    const h = hist(["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25"], ["2026-09-21", "2026-09-22"]);
    expect(deficiencyScore(d, [], h, "2026-09-28", P)).toBe(0);
  });

  test("daily and weekly x7 accrue on the same scale", () => {
    const daily = dish({ cadence: "daily", repeats: 1 });
    const weekly = dish({ cadence: "weekly", repeats: 7 });
    const h = hist([], []);
    expect(deficiencyScore(daily, [], h, "2026-09-28", P)).toBeCloseTo(3.5);
    expect(deficiencyScore(weekly, [], h, "2026-09-28", P)).toBeCloseTo(3.5);
  });

  test("weekdays cadence skips the weekend without charging it", () => {
    const d = dish({ cadence: "weekdays", repeats: 5 });
    // Week 1 (21-25) never ordered: 5 * 0.5 = 2.5. Weekend closed as of Monday 28 but not a period.
    expect(deficiencyScore(d, [], hist(), "2026-09-28", P)).toBeCloseTo(2.5);
    // Nothing more accrues until Friday 2 Oct closes.
    expect(deficiencyScore(d, [], hist(), "2026-10-02", P)).toBeCloseTo(2.5);
    expect(deficiencyScore(d, [], hist(), "2026-10-03", P)).toBeCloseTo(5.0);
  });
});

describe("deficiencyScore, partial and changed periods", () => {
  test("a dish created mid-week is charged only for its short first window", () => {
    const d = dish({ cadence: "weekly", repeats: 7, createdOn: "2026-09-25" }); // Friday
    // Window Fri-Sun, never ordered: shortfall is still 7 repeats, all unordered = 3.5.
    expect(deficiencyScore(d, [], hist(), "2026-09-28", P)).toBeCloseTo(3.5);
  });

  test("a cadence change applies from the next period with the old rule honoured", () => {
    // Weekly x2 until Wed 23 Sep, then edited to daily x1. Snapshot holds weekly x2 for the week of 21 Sep.
    const d = dish({ cadence: "daily", repeats: 1 });
    const snap: RuleSnapshot = { dishId: "d1", periodStart: "2026-09-21", cadence: "weekly", repeats: 2 };
    // Week: done once on Tue. Shortfall 1, unordered -> decay(0) + 0.5.
    // Mon 28, Tue 29 daily never ordered -> +0.5 each. As of Wed 30: 1.5.
    const h = hist(["2026-09-22"], ["2026-09-22"]);
    expect(deficiencyScore(d, [snap], h, "2026-09-30", P)).toBeCloseTo(1.5);
  });

  test("deleted dishes are excluded from batch scoring", () => {
    const live = dish({ id: "a" });
    const gone = dish({ id: "b", deletedOn: "2026-09-25" });
    const scores = deficiencyScores([live, gone], [], new Map(), new Map(), "2026-09-23", P);
    expect(scores.has("a")).toBe(true);
    expect(scores.has("b")).toBe(false);
    expect(scores.get("a")).toBeCloseTo(1.0);
  });
});
