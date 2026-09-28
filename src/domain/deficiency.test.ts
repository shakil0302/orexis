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
  test("a dish created today already owes today's slice", () => {
    expect(deficiencyScore(dish(), [], hist(), "2026-09-21", P)).toBeCloseTo(0.5);
  });

  test("created in the future gives zero", () => {
    expect(deficiencyScore(dish({ createdOn: "2026-10-01" }), [], hist(), "2026-09-21", P)).toBe(0);
  });

  test("never ordered adds C times X per day, today included", () => {
    // Mon, Tue, Wed as of Wed.
    expect(deficiencyScore(dish(), [], hist(), "2026-09-23", P)).toBeCloseTo(1.5);
  });

  test("ordered and skipped adds X per day", () => {
    // Mon, Tue ordered and skipped; Wed not ordered yet.
    expect(deficiencyScore(dish(), [], hist(["2026-09-21", "2026-09-22"]), "2026-09-23", P)).toBeCloseTo(2.5);
    // Once today's order is placed, today counts at the full rate.
    expect(deficiencyScore(dish(), [], hist(["2026-09-21", "2026-09-22", "2026-09-23"]), "2026-09-23", P)).toBeCloseTo(3.0);
  });

  test("completed days add nothing and decay the score", () => {
    // Mon skipped after ordering (1.0), Tue done (decay to 0.8), Wed never ordered (+0.5), Thu today (+0.5).
    const h = hist(["2026-09-21", "2026-09-22"], ["2026-09-22"]);
    expect(deficiencyScore(dish(), [], h, "2026-09-24", P)).toBeCloseTo(1.8);
  });

  test("decay only applies on completion, not on skipped days", () => {
    const h = hist(["2026-09-21"], []);
    expect(deficiencyScore(dish(), [], h, "2026-09-24", P)).toBeCloseTo(2.5);
  });

  test("a completion today is ignored until tomorrow", () => {
    // Mon ordered and skipped (1.0); Tue ordered and done.
    const h = hist(["2026-09-21", "2026-09-22"], ["2026-09-22"]);
    // As of Tue the completion does not count yet: Tue is still owed at the ordered rate.
    expect(deficiencyScore(dish(), [], h, "2026-09-22", P)).toBeCloseTo(2.0);
    // As of Wed it does: Tue decays Mon's 1.0 to 0.8, then Wed itself adds 0.5.
    expect(deficiencyScore(dish(), [], h, "2026-09-23", P)).toBeCloseTo(1.3);
  });
});

describe("deficiencyScore, rises day by day inside a period", () => {
  const slice = 0.5 / 7;

  test("a weekly dish left undone grows each day, today included", () => {
    const d = dish({ cadence: "weekly", repeats: 1 });
    expect(deficiencyScore(d, [], hist(), "2026-09-22", P)).toBeCloseTo(slice * 2); // Tue: Mon and Tue
    expect(deficiencyScore(d, [], hist(), "2026-09-24", P)).toBeCloseTo(slice * 4); // Thu
    expect(deficiencyScore(d, [], hist(), "2026-09-25", P)).toBeCloseTo(slice * 5); // Fri
    expect(deficiencyScore(d, [], hist(), "2026-09-27", P)).toBeCloseTo(0.5); // Sun: whole week
    expect(deficiencyScore(d, [], hist(), "2026-09-28", P)).toBeCloseTo(0.5 + slice); // next Mon starts a new week
  });

  test("doing it on Friday stops the growth and decays what built up", () => {
    const d = dish({ cadence: "weekly", repeats: 1 });
    const h = hist(["2026-09-25"], ["2026-09-25"]);
    // On Friday itself the completion is ignored: Mon-Thu unordered, Fri ordered and still owed.
    expect(deficiencyScore(d, [], h, "2026-09-25", P)).toBeCloseTo(slice * 4 + 1 / 7);
    // From Saturday the completion decays Mon-Thu, and the met repeat stops further accrual.
    const sat = deficiencyScore(d, [], h, "2026-09-26", P);
    expect(sat).toBeCloseTo(slice * 4 * 0.8);
    expect(deficiencyScore(d, [], h, "2026-09-27", P)).toBeCloseTo(sat);
    // The next week starts owing again.
    expect(deficiencyScore(d, [], h, "2026-09-28", P)).toBeCloseTo(sat + slice);
  });

  test("ordering and skipping costs more than not ordering on the same day, today included", () => {
    const d = dish({ cadence: "weekly", repeats: 1 });
    const skipped = deficiencyScore(d, [], hist(["2026-09-21"]), "2026-09-21", P);
    const unordered = deficiencyScore(d, [], hist(), "2026-09-21", P);
    expect(skipped).toBeCloseTo(unordered * 2);
  });
});

describe("deficiencyScore, repeats", () => {
  test("weekly x3 with one completion and one failed order", () => {
    const d = dish({ cadence: "weekly", repeats: 3 });
    // Mon done (decay), Tue unordered, Wed ordered and skipped, Thu-Sun unordered, then next Mon unordered. Slice 3/7.
    const h = hist(["2026-09-21", "2026-09-23"], ["2026-09-21"]);
    expect(deficiencyScore(d, [], h, "2026-09-28", P)).toBeCloseTo((3 / 7) * (0.5 * 5 + 1 + 0.5));
  });

  test("once repeats are met nothing more accrues, whatever was ordered", () => {
    const d = dish({ cadence: "weekly", repeats: 2 });
    const h = hist(["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25"], ["2026-09-21", "2026-09-22"]);
    expect(deficiencyScore(d, [], h, "2026-09-27", P)).toBe(0);
  });

  test("daily and weekly x7 accrue on the same scale", () => {
    const daily = dish({ cadence: "daily", repeats: 1 });
    const weekly = dish({ cadence: "weekly", repeats: 7 });
    expect(deficiencyScore(daily, [], hist(), "2026-09-28", P)).toBeCloseTo(4.0);
    expect(deficiencyScore(weekly, [], hist(), "2026-09-28", P)).toBeCloseTo(4.0);
  });

  test("weekdays cadence does not accrue over the weekend", () => {
    const d = dish({ cadence: "weekdays", repeats: 5 });
    expect(deficiencyScore(d, [], hist(), "2026-09-26", P)).toBeCloseTo(2.5); // Saturday: Mon-Fri 21-25 only
    expect(deficiencyScore(d, [], hist(), "2026-09-28", P)).toBeCloseTo(3.0); // Monday: + itself
    expect(deficiencyScore(d, [], hist(), "2026-10-02", P)).toBeCloseTo(5.0); // + Mon-Fri 28-2
    expect(deficiencyScore(d, [], hist(), "2026-10-03", P)).toBeCloseTo(5.0); // Saturday: same
  });
});

describe("deficiencyScore, partial and changed periods", () => {
  test("a dish created mid-week is charged only for its days", () => {
    const d = dish({ cadence: "weekly", repeats: 7, createdOn: "2026-09-25" }); // Friday
    expect(deficiencyScore(d, [], hist(), "2026-09-28", P)).toBeCloseTo(2.0); // Fri, Sat, Sun, Mon
  });

  test("a cadence change applies from the next period with the old rule honoured", () => {
    // Weekly x2 until Wed 23 Sep, then edited to daily x1. Snapshot holds weekly x2 for the week of 21 Sep.
    const d = dish({ cadence: "daily", repeats: 1 });
    const snap: RuleSnapshot = { dishId: "d1", periodStart: "2026-09-21", cadence: "weekly", repeats: 2 };
    const h = hist(["2026-09-22"], ["2026-09-22"]);
    const slice = 2 / 7;
    const week = (slice * 0.5) * 0.8 + 5 * slice * 0.5; // Mon unordered, Tue done (decay), Wed-Sun unordered
    expect(deficiencyScore(d, [snap], h, "2026-09-30", P)).toBeCloseTo(week + 1.5); // + Mon 28, Tue 29, Wed 30 daily
  });

  test("deleted dishes are excluded from batch scoring", () => {
    const live = dish({ id: "a" });
    const gone = dish({ id: "b", deletedOn: "2026-09-25" });
    const scores = deficiencyScores([live, gone], [], new Map(), new Map(), "2026-09-23", P);
    expect(scores.has("a")).toBe(true);
    expect(scores.has("b")).toBe(false);
    expect(scores.get("a")).toBeCloseTo(1.5);
  });
});
