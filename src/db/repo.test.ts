import { availableDishes } from "../domain/availability";
import { deficiencyScores } from "../domain/deficiency";
import { DOCUMENT_VERSION, parseDocument } from "./model";
import { Repo } from "./repo";
import { MemoryStore } from "./store";

const MON = "2026-09-21";
const TUE = "2026-09-22";
const WED = "2026-09-23";
const NEXT_MON = "2026-09-28";

function setup() {
  const store = new MemoryStore();
  return { store, repo: new Repo(store) };
}

describe("document store", () => {
  test("starts empty and persists every write as a versioned document", () => {
    const { store, repo } = setup();
    expect(store.load()).toBeNull();
    repo.createDish({ name: "A", newCategoryName: "C", durationMin: 10, cadence: "daily", repeats: 1 }, MON);
    const doc = parseDocument(store.load()!);
    expect(doc.version).toBe(DOCUMENT_VERSION);
    expect(doc.dishes).toHaveLength(1);
    expect(doc.categories).toHaveLength(1);
  });

  test("a new repository over the same store sees the same data", () => {
    const { store, repo } = setup();
    const a = repo.createDish({ name: "A", newCategoryName: "C", durationMin: 10, cadence: "daily", repeats: 1 }, MON);
    repo.placeOrder(MON, [a.id], "x");
    repo.complete(MON, a.id, "y");
    const again = new Repo(store);
    expect(again.getDish(a.id)?.name).toBe("A");
    expect(again.getOrder(MON)).not.toBeNull();
    expect(again.listCompletions(MON)).toHaveLength(1);
  });

  test("reads return copies, so mutating them changes nothing", () => {
    const { repo } = setup();
    const a = repo.createDish({ name: "A", newCategoryName: "C", durationMin: 10, cadence: "daily", repeats: 1 }, MON);
    a.name = "hacked";
    repo.listDishes()[0].name = "hacked";
    expect(repo.getDish(a.id)?.name).toBe("A");
  });

  test("export and import round-trip; a bad import changes nothing", () => {
    const { repo } = setup();
    const a = repo.createDish({ name: "A", newCategoryName: "C", durationMin: 10, cadence: "daily", repeats: 1 }, MON);
    const backup = repo.exportJson();
    repo.deleteDish(a.id, TUE);
    expect(repo.listDishes()).toHaveLength(0);
    expect(() => repo.importJson("{\"nope\":true}")).toThrow();
    expect(() => repo.importJson("garbage")).toThrow();
    expect(repo.listDishes()).toHaveLength(0);
    repo.importJson(backup);
    expect(repo.getDish(a.id)?.name).toBe("A");
  });

  test("rejects documents from a newer app version", () => {
    expect(() => new Repo(new MemoryStore(JSON.stringify({ version: DOCUMENT_VERSION + 1 })))).toThrow();
  });
});

describe("dishes and categories", () => {
  test("creating a dish with a new category creates the category once", () => {
    const { repo } = setup();
    const a = repo.createDish({ name: "Gym", newCategoryName: "Mains", durationMin: 60, cadence: "weekly", repeats: 3 }, MON);
    const b = repo.createDish({ name: "Run", newCategoryName: "mains", durationMin: 45, cadence: "weekly", repeats: 1 }, MON);
    expect(a.categoryId).toBe(b.categoryId);
    expect(repo.listCategories()).toHaveLength(1);
    expect(repo.listDishes().map((d) => d.name)).toEqual(["Gym", "Run"]);
  });

  test("validation rejects bad input", () => {
    const { repo } = setup();
    expect(() => repo.createDish({ name: " ", newCategoryName: "X", durationMin: 10, cadence: "daily", repeats: 1 }, MON)).toThrow();
    expect(() => repo.createDish({ name: "A", newCategoryName: "X", durationMin: 0, cadence: "daily", repeats: 1 }, MON)).toThrow();
    expect(() => repo.createDish({ name: "A", newCategoryName: "X", durationMin: 10, cadence: "daily", repeats: 0 }, MON)).toThrow();
    expect(() => repo.createDish({ name: "A", durationMin: 10, cadence: "daily", repeats: 1 }, MON)).toThrow();
    expect(repo.listDishes()).toHaveLength(0);
    expect(repo.listCategories()).toHaveLength(0);
  });

  test("categories are ordered by position and can be moved and renamed", () => {
    const { repo } = setup();
    repo.createDish({ name: "A", newCategoryName: "First", durationMin: 10, cadence: "daily", repeats: 1 }, MON);
    repo.createDish({ name: "B", newCategoryName: "Second", durationMin: 10, cadence: "daily", repeats: 1 }, MON);
    repo.createDish({ name: "C", newCategoryName: "Third", durationMin: 10, cadence: "daily", repeats: 1 }, MON);
    let cats = repo.listCategories();
    expect(cats.map((c) => c.name)).toEqual(["First", "Second", "Third"]);
    repo.moveCategory(cats[2].id, "up");
    cats = repo.listCategories();
    expect(cats.map((c) => c.name)).toEqual(["First", "Third", "Second"]);
    repo.moveCategory(cats[0].id, "up"); // no-op at the top
    expect(repo.listCategories().map((c) => c.name)).toEqual(["First", "Third", "Second"]);
    repo.renameCategory(cats[0].id, " Starters ");
    expect(repo.listCategories()[0].name).toBe("Starters");
  });

  test("moving the last dish out of a category deletes the category", () => {
    const { repo } = setup();
    const a = repo.createDish({ name: "A", newCategoryName: "Old", durationMin: 10, cadence: "daily", repeats: 1 }, MON);
    repo.createDish({ name: "B", newCategoryName: "New", durationMin: 10, cadence: "daily", repeats: 1 }, MON);
    const newCat = repo.listCategories().find((c) => c.name === "New")!;
    repo.updateDish(a.id, { name: "A", categoryId: newCat.id, durationMin: 10, cadence: "daily", repeats: 1 }, MON);
    expect(repo.listCategories().map((c) => c.name)).toEqual(["New"]);
  });

  test("deleting a dish removes its history and empties its category", () => {
    const { repo } = setup();
    const a = repo.createDish({ name: "A", newCategoryName: "Only", durationMin: 10, cadence: "daily", repeats: 1 }, MON);
    repo.placeOrder(MON, [a.id], "2026-09-21T07:05:00");
    repo.complete(MON, a.id, "2026-09-21T09:00:00");
    repo.deleteDish(a.id, TUE);
    expect(repo.listDishes()).toHaveLength(0);
    expect(repo.listCategories()).toHaveLength(0);
    expect(repo.listOrderItems()).toHaveLength(0);
    expect(repo.listCompletions()).toHaveLength(0);
    expect(repo.listOrders()).toHaveLength(0);
    expect(repo.getDish(a.id)).toBeNull();
  });

  test("today's order row survives even when its only item is deleted", () => {
    const { repo } = setup();
    const a = repo.createDish({ name: "A", newCategoryName: "Only", durationMin: 10, cadence: "daily", repeats: 1 }, MON);
    repo.placeOrder(MON, [a.id], "2026-09-21T07:05:00");
    repo.deleteDish(a.id, MON);
    expect(repo.getOrder(MON)).not.toBeNull();
  });
});

describe("rule changes", () => {
  test("changing cadence snapshots the rule in force for the current period", () => {
    const { repo } = setup();
    const a = repo.createDish({ name: "Gym", newCategoryName: "Mains", durationMin: 60, cadence: "weekly", repeats: 3 }, MON);
    repo.updateDish(a.id, { name: "Gym", categoryId: a.categoryId, durationMin: 60, cadence: "monthly", repeats: 1 }, WED);
    const snaps = repo.listSnapshots();
    expect(snaps).toEqual([{ dishId: a.id, periodStart: MON, cadence: "weekly", repeats: 3 }]);
    // This week still runs on weekly x3.
    const [s] = availableDishes(repo.listDishes(), snaps, [], WED);
    expect(s.repeats).toBe(3);
    // Next week runs on monthly x1.
    const [n] = availableDishes(repo.listDishes(), snaps, [], NEXT_MON);
    expect(n.repeats).toBe(1);
  });

  test("a second edit in the same period keeps the original snapshot", () => {
    const { repo } = setup();
    const a = repo.createDish({ name: "Gym", newCategoryName: "Mains", durationMin: 60, cadence: "weekly", repeats: 3 }, MON);
    repo.updateDish(a.id, { name: "Gym", categoryId: a.categoryId, durationMin: 60, cadence: "monthly", repeats: 1 }, TUE);
    repo.updateDish(a.id, { name: "Gym", categoryId: a.categoryId, durationMin: 60, cadence: "daily", repeats: 1 }, WED);
    expect(repo.listSnapshots()).toEqual([{ dishId: a.id, periodStart: MON, cadence: "weekly", repeats: 3 }]);
    expect(repo.getDish(a.id)?.cadence).toBe("daily");
  });

  test("editing name or duration only leaves no snapshot", () => {
    const { repo } = setup();
    const a = repo.createDish({ name: "Gym", newCategoryName: "Mains", durationMin: 60, cadence: "weekly", repeats: 3 }, MON);
    repo.updateDish(a.id, { name: "Gym session", categoryId: a.categoryId, durationMin: 75, cadence: "weekly", repeats: 3 }, TUE);
    expect(repo.listSnapshots()).toHaveLength(0);
    expect(repo.getDish(a.id)?.durationMin).toBe(75);
  });
});

describe("orders and completions", () => {
  test("one order per day, completions only for ordered dishes, once per day", () => {
    const { repo } = setup();
    const a = repo.createDish({ name: "A", newCategoryName: "C", durationMin: 10, cadence: "daily", repeats: 1 }, MON);
    const b = repo.createDish({ name: "B", newCategoryName: "C", durationMin: 10, cadence: "daily", repeats: 1 }, MON);
    repo.placeOrder(MON, [a.id, a.id], "2026-09-21T07:05:00");
    expect(() => repo.placeOrder(MON, [b.id], "2026-09-21T08:00:00")).toThrow();
    expect(repo.listOrderItems(MON)).toEqual([{ day: MON, dishId: a.id }]);
    expect(() => repo.complete(MON, b.id, "x")).toThrow();
    repo.complete(MON, a.id, "2026-09-21T09:00:00");
    repo.complete(MON, a.id, "2026-09-21T10:00:00");
    expect(repo.listCompletions(MON)).toHaveLength(1);
    repo.uncomplete(MON, a.id);
    expect(repo.listCompletions(MON)).toHaveLength(0);
  });

  test("the full loop feeds deficiency scoring", () => {
    const { repo } = setup();
    const a = repo.createDish({ name: "A", newCategoryName: "C", durationMin: 10, cadence: "daily", repeats: 1 }, MON);
    const b = repo.createDish({ name: "B", newCategoryName: "C", durationMin: 10, cadence: "daily", repeats: 1 }, MON);
    repo.placeOrder(MON, [a.id, b.id], "2026-09-21T07:05:00");
    repo.complete(MON, a.id, "2026-09-21T09:00:00");
    repo.placeOrder(TUE, [a.id], "2026-09-22T07:05:00");
    const h = repo.historyByDish();
    const scores = deficiencyScores(repo.listDishes(), repo.listSnapshots(), h.ordered, h.completed, WED);
    // A: Mon done (decay of 0), Tue ordered and skipped (+1), Wed not ordered yet (+0.5).
    expect(scores.get(a.id)).toBeCloseTo(1.5);
    // B: Mon ordered and skipped (+1), Tue never ordered (+0.5), Wed not ordered yet (+0.5).
    expect(scores.get(b.id)).toBeCloseTo(2.0);
  });
});
