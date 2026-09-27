import type { DishStatus } from "./availability";
import { canPlaceOrder, formatMinutes, groupByCategory, sortByDeficiency, suggestedDishIds, totalMinutes } from "./ordering";
import type { Category, Dish } from "./types";

function dish(id: string, categoryId: string, name: string, durationMin = 30): Dish {
  return { id, categoryId, name, durationMin, cadence: "daily", repeats: 1, createdOn: "2026-09-01", deletedOn: null };
}

function status(d: Dish): DishStatus {
  return { dish: d, period: { start: "2026-09-27", end: "2026-09-27" }, windowStart: "2026-09-27", done: 0, repeats: 1, doneToday: false };
}

const cats: Category[] = [
  { id: "sides", name: "Sides", position: 1 },
  { id: "mains", name: "Mains", position: 0 },
];
const a = dish("a", "mains", "Deep work", 90);
const b = dish("b", "mains", "Gym", 60);
const c = dish("c", "sides", "Read", 25);
const d = dish("d", "sides", "Tidy", 10);
const statuses = [a, b, c, d].map(status);
const scores = new Map([
  ["a", 3.4],
  ["b", 1.6],
  ["c", 0],
  ["d", 0.5],
]);

describe("ordering helpers", () => {
  test("canPlaceOrder is false once today has an order", () => {
    expect(canPlaceOrder([], "2026-09-27")).toBe(true);
    expect(canPlaceOrder([{ day: "2026-09-26", placedAt: "x" }], "2026-09-27")).toBe(true);
    expect(canPlaceOrder([{ day: "2026-09-27", placedAt: "x" }], "2026-09-27")).toBe(false);
  });

  test("totalMinutes and formatMinutes", () => {
    expect(totalMinutes([a, b, c])).toBe(175);
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(60)).toBe("1 h");
    expect(formatMinutes(130)).toBe("2 h 10 min");
    expect(formatMinutes(0)).toBe("0 min");
  });

  test("sortByDeficiency orders by score then name", () => {
    const ids = sortByDeficiency(statuses, scores).map((s) => s.dish.id);
    expect(ids).toEqual(["a", "b", "d", "c"]);
    const tied = sortByDeficiency([status(b), status(a)], new Map()).map((s) => s.dish.id);
    expect(tied).toEqual(["a", "b"]);
  });

  test("suggested is the top scorer per category with a positive score", () => {
    expect([...suggestedDishIds(statuses, scores)].sort()).toEqual(["a", "d"]);
    expect(suggestedDishIds(statuses, new Map()).size).toBe(0);
  });

  test("groupByCategory follows category position and drops empty categories", () => {
    const groups = groupByCategory([...cats, { id: "empty", name: "Empty", position: 2 }], statuses, scores);
    expect(groups.map((g) => g.category.id)).toEqual(["mains", "sides"]);
    expect(groups[0].items.map((s) => s.dish.id)).toEqual(["a", "b"]);
    expect(groups[1].items.map((s) => s.dish.id)).toEqual(["d", "c"]);
  });
});
