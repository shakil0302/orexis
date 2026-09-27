import { periodFor } from "../domain/periods";
import { ruleInForce } from "../domain/rules";
import type { Cadence, Category, Completion, Dish, ISODate, Order, OrderItem, RuleSnapshot } from "../domain/types";
import type { SqlDb } from "./sql";

export interface DishInput {
  name: string;
  /** Existing category id, or omit and give newCategoryName. */
  categoryId?: string;
  newCategoryName?: string;
  durationMin: number;
  cadence: Cadence;
  repeats: number;
}

interface CategoryRow {
  id: string;
  name: string;
  position: number;
}
interface DishRow {
  id: string;
  category_id: string;
  name: string;
  duration_min: number;
  cadence: Cadence;
  repeats: number;
  created_on: string;
}
interface SnapshotRow {
  dish_id: string;
  period_start: string;
  cadence: Cadence;
  repeats: number;
}
interface OrderRow {
  day: string;
  placed_at: string;
}
interface OrderItemRow {
  day: string;
  dish_id: string;
}
interface CompletionRow {
  day: string;
  dish_id: string;
  done_at: string;
}

function rowToDish(r: DishRow): Dish {
  return {
    id: r.id,
    categoryId: r.category_id,
    name: r.name,
    durationMin: r.duration_min,
    cadence: r.cadence,
    repeats: r.repeats,
    createdOn: r.created_on,
    // Deletion is physical: a dish row that exists is live.
    deletedOn: null,
  };
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

export class Repo {
  constructor(private readonly db: SqlDb) {}

  // ---- reads --------------------------------------------------------------

  listCategories(): Category[] {
    return this.db.getAllSync<CategoryRow>("SELECT id, name, position FROM categories ORDER BY position, name");
  }

  listDishes(): Dish[] {
    return this.db
      .getAllSync<DishRow>("SELECT * FROM dishes ORDER BY name")
      .map(rowToDish);
  }

  getDish(id: string): Dish | null {
    const r = this.db.getFirstSync<DishRow>("SELECT * FROM dishes WHERE id = ?", [id]);
    return r ? rowToDish(r) : null;
  }

  listSnapshots(): RuleSnapshot[] {
    return this.db
      .getAllSync<SnapshotRow>("SELECT * FROM dish_rule_history")
      .map((r) => ({ dishId: r.dish_id, periodStart: r.period_start, cadence: r.cadence, repeats: r.repeats }));
  }

  listOrders(): Order[] {
    return this.db.getAllSync<OrderRow>("SELECT * FROM orders ORDER BY day").map((r) => ({ day: r.day, placedAt: r.placed_at }));
  }

  getOrder(day: ISODate): Order | null {
    const r = this.db.getFirstSync<OrderRow>("SELECT * FROM orders WHERE day = ?", [day]);
    return r ? { day: r.day, placedAt: r.placed_at } : null;
  }

  listOrderItems(day?: ISODate): OrderItem[] {
    const rows = day
      ? this.db.getAllSync<OrderItemRow>("SELECT * FROM order_items WHERE day = ?", [day])
      : this.db.getAllSync<OrderItemRow>("SELECT * FROM order_items");
    return rows.map((r) => ({ day: r.day, dishId: r.dish_id }));
  }

  listCompletions(day?: ISODate): Completion[] {
    const rows = day
      ? this.db.getAllSync<CompletionRow>("SELECT * FROM completions WHERE day = ?", [day])
      : this.db.getAllSync<CompletionRow>("SELECT * FROM completions");
    return rows.map((r) => ({ day: r.day, dishId: r.dish_id, doneAt: r.done_at }));
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
    this.db.runSync("UPDATE categories SET name = ? WHERE id = ?", [name.trim(), id]);
  }

  /** Swaps the category with its neighbour. No-op at the ends. */
  moveCategory(id: string, direction: "up" | "down"): void {
    const cats = this.listCategories();
    const i = cats.findIndex((c) => c.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= cats.length) return;
    this.db.withTransactionSync(() => {
      this.db.runSync("UPDATE categories SET position = ? WHERE id = ?", [cats[j].position, cats[i].id]);
      this.db.runSync("UPDATE categories SET position = ? WHERE id = ?", [cats[i].position, cats[j].id]);
    });
  }

  private ensureCategory(input: DishInput): string {
    if (input.categoryId) return input.categoryId;
    const name = (input.newCategoryName ?? "").trim();
    if (!name) throw new Error("A category is required");
    const existing = this.db.getFirstSync<{ id: string }>("SELECT id FROM categories WHERE name = ? COLLATE NOCASE", [name]);
    if (existing) return existing.id;
    const max = this.db.getFirstSync<{ m: number | null }>("SELECT MAX(position) AS m FROM categories");
    const id = newId();
    this.db.runSync("INSERT INTO categories (id, name, position) VALUES (?, ?, ?)", [id, name, (max?.m ?? -1) + 1]);
    return id;
  }

  private pruneEmptyCategories(): void {
    this.db.runSync(
      "DELETE FROM categories WHERE id NOT IN (SELECT DISTINCT category_id FROM dishes)",
    );
  }

  // ---- dishes -------------------------------------------------------------

  createDish(input: DishInput, today: ISODate): Dish {
    validateDish(input);
    let id = "";
    this.db.withTransactionSync(() => {
      const categoryId = this.ensureCategory(input);
      id = newId();
      this.db.runSync(
        "INSERT INTO dishes (id, category_id, name, duration_min, cadence, repeats, created_on) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [id, categoryId, input.name.trim(), input.durationMin, input.cadence, input.repeats, today],
      );
    });
    return this.getDish(id)!;
  }

  /**
   * Name, category, and duration apply at once. A cadence or repeats change
   * applies from the next period; the period under way keeps its old rule.
   */
  updateDish(id: string, input: DishInput, today: ISODate): Dish {
    validateDish(input);
    const before = this.getDish(id);
    if (!before) throw new Error("Dish not found");
    this.db.withTransactionSync(() => {
      const categoryId = this.ensureCategory(input);
      const ruleChanged = before.cadence !== input.cadence || before.repeats !== input.repeats;
      if (ruleChanged) {
        const inForce = ruleInForce(before, this.listSnapshots(), today);
        const period = periodFor(inForce.cadence, today);
        if (period) {
          this.db.runSync(
            "INSERT OR IGNORE INTO dish_rule_history (dish_id, period_start, cadence, repeats) VALUES (?, ?, ?, ?)",
            [id, period.start, inForce.cadence, inForce.repeats],
          );
        }
      }
      this.db.runSync(
        "UPDATE dishes SET category_id = ?, name = ?, duration_min = ?, cadence = ?, repeats = ? WHERE id = ?",
        [categoryId, input.name.trim(), input.durationMin, input.cadence, input.repeats, id],
      );
      this.pruneEmptyCategories();
    });
    return this.getDish(id)!;
  }

  /** Removes the dish and everything that referenced it. Today's order row is kept so the day stays locked. */
  deleteDish(id: string, today: ISODate): void {
    this.db.withTransactionSync(() => {
      this.db.runSync("DELETE FROM completions WHERE dish_id = ?", [id]);
      this.db.runSync("DELETE FROM order_items WHERE dish_id = ?", [id]);
      this.db.runSync("DELETE FROM dish_rule_history WHERE dish_id = ?", [id]);
      this.db.runSync("DELETE FROM dishes WHERE id = ?", [id]);
      this.db.runSync("DELETE FROM orders WHERE day NOT IN (SELECT DISTINCT day FROM order_items) AND day <> ?", [today]);
      this.pruneEmptyCategories();
    });
  }

  // ---- orders and completions --------------------------------------------

  placeOrder(day: ISODate, dishIds: string[], placedAt: string): void {
    if (this.getOrder(day)) throw new Error("An order already exists for this day");
    this.db.withTransactionSync(() => {
      this.db.runSync("INSERT INTO orders (day, placed_at) VALUES (?, ?)", [day, placedAt]);
      for (const dishId of new Set(dishIds)) {
        this.db.runSync("INSERT INTO order_items (day, dish_id) VALUES (?, ?)", [day, dishId]);
      }
    });
  }

  /** Records a completion for an ordered dish. Ignored if already completed that day. */
  complete(day: ISODate, dishId: string, doneAt: string): void {
    const ordered = this.db.getFirstSync<{ n: number }>("SELECT COUNT(*) AS n FROM order_items WHERE day = ? AND dish_id = ?", [
      day,
      dishId,
    ]);
    if (!ordered || ordered.n === 0) throw new Error("Dish was not ordered on this day");
    this.db.runSync("INSERT OR IGNORE INTO completions (day, dish_id, done_at) VALUES (?, ?, ?)", [day, dishId, doneAt]);
  }

  uncomplete(day: ISODate, dishId: string): void {
    this.db.runSync("DELETE FROM completions WHERE day = ? AND dish_id = ?", [day, dishId]);
  }

  /** Days each dish was ordered and completed, for deficiency scoring. */
  historyByDish(): { ordered: Map<string, Set<ISODate>>; completed: Map<string, Set<ISODate>> } {
    const ordered = new Map<string, Set<ISODate>>();
    const completed = new Map<string, Set<ISODate>>();
    for (const r of this.db.getAllSync<OrderItemRow>("SELECT day, dish_id FROM order_items")) {
      let s = ordered.get(r.dish_id);
      if (!s) ordered.set(r.dish_id, (s = new Set()));
      s.add(r.day);
    }
    for (const r of this.db.getAllSync<CompletionRow>("SELECT day, dish_id, done_at FROM completions")) {
      let s = completed.get(r.dish_id);
      if (!s) completed.set(r.dish_id, (s = new Set()));
      s.add(r.day);
    }
    return { ordered, completed };
  }
}

function validateDish(input: DishInput): void {
  if (!input.name.trim()) throw new Error("Name is required");
  if (!Number.isInteger(input.durationMin) || input.durationMin <= 0) throw new Error("Duration must be a whole number of minutes");
  if (!Number.isInteger(input.repeats) || input.repeats < 1) throw new Error("Repeats must be at least 1");
}
