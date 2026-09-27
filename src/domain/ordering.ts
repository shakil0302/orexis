import type { DishStatus } from "./availability";
import type { Category, Dish, ISODate, Order } from "./types";

export function canPlaceOrder(orders: Order[], today: ISODate): boolean {
  return !orders.some((o) => o.day === today);
}

export function totalMinutes(dishes: Dish[]): number {
  return dishes.reduce((sum, d) => sum + d.durationMin, 0);
}

/** "45 min", "1 h", "2 h 10 min". */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Highest score first, then name, so a stable list survives ties. */
export function sortByDeficiency(statuses: DishStatus[], scores: Map<string, number>): DishStatus[] {
  return [...statuses].sort((a, b) => {
    const diff = (scores.get(b.dish.id) ?? 0) - (scores.get(a.dish.id) ?? 0);
    if (diff !== 0) return diff;
    return a.dish.name.localeCompare(b.dish.name);
  });
}

/** The top-scoring dish in each category, when its score is above zero. */
export function suggestedDishIds(statuses: DishStatus[], scores: Map<string, number>): Set<string> {
  const best = new Map<string, { id: string; score: number }>();
  for (const s of statuses) {
    const score = scores.get(s.dish.id) ?? 0;
    if (score <= 0) continue;
    const cur = best.get(s.dish.categoryId);
    if (!cur || score > cur.score) best.set(s.dish.categoryId, { id: s.dish.id, score });
  }
  return new Set([...best.values()].map((b) => b.id));
}

export interface CategoryGroup {
  category: Category;
  items: DishStatus[];
}

/** Categories in menu order, each with its dishes sorted by deficiency. Empty categories are omitted. */
export function groupByCategory(
  categories: Category[],
  statuses: DishStatus[],
  scores: Map<string, number>,
): CategoryGroup[] {
  const sorted = sortByDeficiency(statuses, scores);
  return [...categories]
    .sort((a, b) => a.position - b.position)
    .map((category) => ({ category, items: sorted.filter((s) => s.dish.categoryId === category.id) }))
    .filter((g) => g.items.length > 0);
}
