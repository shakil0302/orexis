import { availableDishes, dishStatuses } from "./availability";
import type { Completion, Dish, RuleSnapshot } from "./types";

function dish(over: Partial<Dish> = {}): Dish {
  return {
    id: "d1",
    categoryId: "c1",
    name: "Gym",
    durationMin: 60,
    cadence: "weekly",
    repeats: 3,
    createdOn: "2026-09-01",
    deletedOn: null,
    ...over,
  };
}

function done(day: string, dishId = "d1"): Completion {
  return { day, dishId, doneAt: `${day}T10:00:00` };
}

// Week of 2026-09-21 (Mon) to 2026-09-27 (Sun).
const WED = "2026-09-23";
const SAT = "2026-09-26";

describe("availableDishes", () => {
  test("a fresh weekly dish is available", () => {
    const [s] = availableDishes([dish()], [], [], WED);
    expect(s.dish.id).toBe("d1");
    expect(s.done).toBe(0);
    expect(s.repeats).toBe(3);
  });

  test("progress counts completions in the current period only", () => {
    const completions = [done("2026-09-14"), done("2026-09-21"), done("2026-09-22")];
    const [s] = availableDishes([dish()], [], completions, WED);
    expect(s.done).toBe(2);
  });

  test("repeats exhausted removes the dish", () => {
    const completions = [done("2026-09-21"), done("2026-09-22"), done("2026-09-23")];
    expect(availableDishes([dish()], [], completions, "2026-09-24")).toHaveLength(0);
  });

  test("done today removes the dish even with repeats left", () => {
    expect(availableDishes([dish()], [], [done(WED)], WED)).toHaveLength(0);
    expect(dishStatuses([dish()], [], [done(WED)], WED)[0].doneToday).toBe(true);
  });

  test("weekdays dish is absent on Saturday", () => {
    expect(availableDishes([dish({ cadence: "weekdays" })], [], [], SAT)).toHaveLength(0);
    expect(availableDishes([dish({ cadence: "weekdays" })], [], [], WED)).toHaveLength(1);
  });

  test("weekends dish is absent on Wednesday", () => {
    expect(availableDishes([dish({ cadence: "weekends", repeats: 1 })], [], [], WED)).toHaveLength(0);
    expect(availableDishes([dish({ cadence: "weekends", repeats: 1 })], [], [], SAT)).toHaveLength(1);
  });

  test("deleted and not-yet-created dishes are skipped", () => {
    expect(availableDishes([dish({ deletedOn: "2026-09-20" })], [], [], WED)).toHaveLength(0);
    expect(availableDishes([dish({ createdOn: "2026-09-24" })], [], [], WED)).toHaveLength(0);
    expect(availableDishes([dish({ createdOn: WED })], [], [], WED)).toHaveLength(1);
  });

  test("a snapshot keeps the old rule for the current period", () => {
    // Edited on Wednesday from weekly x3 to monthly x1; this week still runs on weekly x3.
    const d = dish({ cadence: "monthly", repeats: 1 });
    const snap: RuleSnapshot = { dishId: "d1", periodStart: "2026-09-21", cadence: "weekly", repeats: 3 };
    const [s] = dishStatuses([d], [snap], [done("2026-09-21")], WED);
    expect(s.repeats).toBe(3);
    expect(s.period).toEqual({ start: "2026-09-21", end: "2026-09-27" });
    expect(s.done).toBe(1);
  });

  test("after the snapshot period the new rule applies and earlier completions are not counted", () => {
    const d = dish({ cadence: "monthly", repeats: 1 });
    const snap: RuleSnapshot = { dishId: "d1", periodStart: "2026-09-21", cadence: "weekly", repeats: 3 };
    // Monday 28 Sep: monthly period is 1-30 Sep, but only from 28 Sep counts.
    const [s] = dishStatuses([d], [snap], [done("2026-09-21"), done("2026-09-25")], "2026-09-28");
    expect(s.repeats).toBe(1);
    expect(s.windowStart).toBe("2026-09-28");
    expect(s.done).toBe(0);
  });

  test("a dish created mid-period only counts from creation", () => {
    const d = dish({ cadence: "monthly", repeats: 2, createdOn: "2026-09-20" });
    const [s] = dishStatuses([d], [], [done("2026-09-10"), done("2026-09-22")], WED);
    expect(s.windowStart).toBe("2026-09-20");
    expect(s.done).toBe(1);
  });
});
