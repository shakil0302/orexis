import type { Repo } from "../db/repo";
import { dishStatuses, type DishStatus } from "../domain/availability";
import { deficiencyScores } from "../domain/deficiency";
import { groupByCategory, suggestedDishIds, type CategoryGroup } from "../domain/ordering";
import type { Category, Completion, Dish, ISODate, Order, OrderItem, RuleSnapshot } from "../domain/types";

/** Everything a screen needs for one day, derived once from the repository. */
export interface AppData {
  today: ISODate;
  categories: Category[];
  dishes: Dish[];
  snapshots: RuleSnapshot[];
  /** Today's order, if placed. */
  order: Order | null;
  orderItems: OrderItem[];
  completionsToday: Completion[];
  /** Every live dish with a period containing today. */
  statuses: DishStatus[];
  /** Subset that can still be ordered today. */
  available: DishStatus[];
  scores: Map<string, number>;
  suggested: Set<string>;
  /** Available dishes grouped by category in menu order. */
  availableGroups: CategoryGroup[];
}

export function loadAppData(repo: Repo, today: ISODate): AppData {
  const categories = repo.listCategories();
  const dishes = repo.listDishes();
  const snapshots = repo.listSnapshots();
  const completions = repo.listCompletions();
  const history = repo.historyByDish();

  const statuses = dishStatuses(dishes, snapshots, completions, today);
  const available = statuses.filter((s) => s.done < s.repeats && !s.doneToday);
  const scores = deficiencyScores(dishes, snapshots, history.ordered, history.completed, today);

  return {
    today,
    categories,
    dishes,
    snapshots,
    order: repo.getOrder(today),
    orderItems: repo.listOrderItems(today),
    completionsToday: completions.filter((c) => c.day === today),
    statuses,
    available,
    scores,
    suggested: suggestedDishIds(available, scores),
    availableGroups: groupByCategory(categories, available, scores),
  };
}
