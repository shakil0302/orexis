import { periodFor } from "../domain/periods";
import { ruleInForce } from "../domain/rules";
import type { Cadence, Category, Completion, Dish, ISODate, Order, OrderItem, RuleSnapshot } from "../domain/types";
import { emptyDocument, parseDocument, serializeDocument, type Document } from "./model";
import type { DocumentStore } from "./store";

export interface DishInput {
  name: string;
  /** Existing category id, or omit and give newCategoryName. */
  categoryId?: string;
  newCategoryName?: string;
  durationMin: number;
  cadence: Cadence;
  repeats: number;
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** Everything the screens need, loaded in one go. */
export interface Snapshot {
  categories: Category[];
  dishes: Dish[];
  snapshots: RuleSnapshot[];
  orders: Order[];
  orderItems: OrderItem[];
  completions: Completion[];
}

/**
 * All data lives in one in-memory document that is written back to the store
 * after every change. Reads return copies so callers cannot mutate state.
 */
export class Repo {
  private doc: Document;

  constructor(private readonly store: DocumentStore) {
    const json = store.load();
    this.doc = json ? parseDocument(json) : emptyDocument();
  }

  private commit(): void {
    this.store.save(serializeDocument(this.doc));
  }

  /** The current document as JSON, for backup. */
  exportJson(): string {
    return serializeDocument(this.doc);
  }

  /** Replaces everything with the given backup. Throws and changes nothing if it is not valid. */
  importJson(json: string): void {
    this.doc = parseDocument(json);
    this.commit();
  }

  // ---- reads --------------------------------------------------------------

  listCategories(): Category[] {
    return [...this.doc.categories].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)).map((c) => ({ ...c }));
  }

  listDishes(): Dish[] {
    return [...this.doc.dishes].sort((a, b) => a.name.localeCompare(b.name)).map((d) => ({ ...d }));
  }

  getDish(id: string): Dish | null {
    const d = this.doc.dishes.find((x) => x.id === id);
    return d ? { ...d } : null;
  }

  listSnapshots(): RuleSnapshot[] {
    return this.doc.snapshots.map((s) => ({ ...s }));
  }

  listOrders(): Order[] {
    return [...this.doc.orders].sort((a, b) => a.day.localeCompare(b.day)).map((o) => ({ ...o }));
  }

  getOrder(day: ISODate): Order | null {
    const o = this.doc.orders.find((x) => x.day === day);
    return o ? { ...o } : null;
  }

  listOrderItems(day?: ISODate): OrderItem[] {
    return this.doc.orderItems.filter((i) => day === undefined || i.day === day).map((i) => ({ ...i }));
  }

  listCompletions(day?: ISODate): Completion[] {
    return this.doc.completions.filter((c) => day === undefined || c.day === day).map((c) => ({ ...c }));
  }

  load(): Snapshot {
    return {
      categories: this.listCategories(),
      dishes: this.listDishes(),
      snapshots: this.listSnapshots(),
      orders: this.listOrders(),
      orderItems: this.listOrderItems(),
      completions: this.listCompletions(),
    };
  }

  // ---- categories ---------------------------------------------------------

  renameCategory(id: string, name: string): void {
    const c = this.doc.categories.find((x) => x.id === id);
    if (!c) return;
    c.name = name.trim();
    this.commit();
  }

  /** Swaps the category with its neighbour. No-op at the ends. */
  moveCategory(id: string, direction: "up" | "down"): void {
    const cats = this.listCategories();
    const i = cats.findIndex((c) => c.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= cats.length) return;
    const a = this.doc.categories.find((c) => c.id === cats[i].id)!;
    const b = this.doc.categories.find((c) => c.id === cats[j].id)!;
    [a.position, b.position] = [b.position, a.position];
    this.commit();
  }

  private ensureCategory(input: DishInput): string {
    if (input.categoryId) {
      if (!this.doc.categories.some((c) => c.id === input.categoryId)) throw new Error("Category not found");
      return input.categoryId;
    }
    const name = (input.newCategoryName ?? "").trim();
    if (!name) throw new Error("A category is required");
    const existing = this.doc.categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;
    const position = this.doc.categories.reduce((m, c) => Math.max(m, c.position), -1) + 1;
    const id = newId();
    this.doc.categories.push({ id, name, position });
    return id;
  }

  private pruneEmptyCategories(): void {
    const used = new Set(this.doc.dishes.map((d) => d.categoryId));
    this.doc.categories = this.doc.categories.filter((c) => used.has(c.id));
  }

  // ---- dishes -------------------------------------------------------------

  createDish(input: DishInput, today: ISODate): Dish {
    validateDish(input);
    const categoryId = this.ensureCategory(input);
    const dish: Dish = {
      id: newId(),
      categoryId,
      name: input.name.trim(),
      durationMin: input.durationMin,
      cadence: input.cadence,
      repeats: input.repeats,
      createdOn: today,
      deletedOn: null,
    };
    this.doc.dishes.push(dish);
    this.commit();
    return { ...dish };
  }

  /**
   * Name, category, and duration apply at once. A cadence or repeats change
   * applies from the next period; the period under way keeps its old rule.
   */
  updateDish(id: string, input: DishInput, today: ISODate): Dish {
    validateDish(input);
    const dish = this.doc.dishes.find((d) => d.id === id);
    if (!dish) throw new Error("Dish not found");
    const categoryId = this.ensureCategory(input);

    const ruleChanged = dish.cadence !== input.cadence || dish.repeats !== input.repeats;
    if (ruleChanged) {
      const inForce = ruleInForce(dish, this.doc.snapshots, today);
      const period = periodFor(inForce.cadence, today);
      if (period && !this.doc.snapshots.some((s) => s.dishId === id && s.periodStart === period.start)) {
        this.doc.snapshots.push({ dishId: id, periodStart: period.start, cadence: inForce.cadence, repeats: inForce.repeats });
      }
    }

    dish.categoryId = categoryId;
    dish.name = input.name.trim();
    dish.durationMin = input.durationMin;
    dish.cadence = input.cadence;
    dish.repeats = input.repeats;
    this.pruneEmptyCategories();
    this.commit();
    return { ...dish };
  }

  /** Removes the dish and everything that referenced it. Today's order row is kept so the day stays locked. */
  deleteDish(id: string, today: ISODate): void {
    this.doc.completions = this.doc.completions.filter((c) => c.dishId !== id);
    this.doc.orderItems = this.doc.orderItems.filter((i) => i.dishId !== id);
    this.doc.snapshots = this.doc.snapshots.filter((s) => s.dishId !== id);
    this.doc.dishes = this.doc.dishes.filter((d) => d.id !== id);
    const daysWithItems = new Set(this.doc.orderItems.map((i) => i.day));
    this.doc.orders = this.doc.orders.filter((o) => daysWithItems.has(o.day) || o.day === today);
    this.pruneEmptyCategories();
    this.commit();
  }

  // ---- orders and completions --------------------------------------------

  placeOrder(day: ISODate, dishIds: string[], placedAt: string): void {
    if (this.getOrder(day)) throw new Error("An order already exists for this day");
    this.doc.orders.push({ day, placedAt });
    for (const dishId of new Set(dishIds)) {
      if (!this.doc.dishes.some((d) => d.id === dishId)) throw new Error("Dish not found");
      this.doc.orderItems.push({ day, dishId });
    }
    this.commit();
  }

  /** Records a completion for an ordered dish. Ignored if already completed that day. */
  complete(day: ISODate, dishId: string, doneAt: string): void {
    if (!this.doc.orderItems.some((i) => i.day === day && i.dishId === dishId)) {
      throw new Error("Dish was not ordered on this day");
    }
    if (this.doc.completions.some((c) => c.day === day && c.dishId === dishId)) return;
    this.doc.completions.push({ day, dishId, doneAt });
    this.commit();
  }

  uncomplete(day: ISODate, dishId: string): void {
    const before = this.doc.completions.length;
    this.doc.completions = this.doc.completions.filter((c) => !(c.day === day && c.dishId === dishId));
    if (this.doc.completions.length !== before) this.commit();
  }

  /** Days each dish was ordered and completed, for deficiency scoring. */
  historyByDish(): { ordered: Map<string, Set<ISODate>>; completed: Map<string, Set<ISODate>> } {
    const ordered = new Map<string, Set<ISODate>>();
    const completed = new Map<string, Set<ISODate>>();
    for (const i of this.doc.orderItems) {
      let s = ordered.get(i.dishId);
      if (!s) ordered.set(i.dishId, (s = new Set()));
      s.add(i.day);
    }
    for (const c of this.doc.completions) {
      let s = completed.get(c.dishId);
      if (!s) completed.set(c.dishId, (s = new Set()));
      s.add(c.day);
    }
    return { ordered, completed };
  }
}

function validateDish(input: DishInput): void {
  if (!input.name.trim()) throw new Error("Name is required");
  if (!Number.isInteger(input.durationMin) || input.durationMin <= 0) throw new Error("Duration must be a whole number of minutes");
  if (!Number.isInteger(input.repeats) || input.repeats < 1) throw new Error("Repeats must be at least 1");
}
