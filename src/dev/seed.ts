import type { Repo } from "../db/repo";
import type { ISODate } from "../domain/types";

/** Development helper: fills an empty menu with a realistic sample. */
export function seedSampleMenu(repo: Repo, today: ISODate): void {
  if (repo.listDishes().length > 0) return;
  const rows: Parameters<Repo["createDish"]>[0][] = [
    { name: "Deep work block", newCategoryName: "Mains", durationMin: 90, cadence: "weekdays", repeats: 5 },
    { name: "Gym", newCategoryName: "Mains", durationMin: 60, cadence: "weekly", repeats: 3 },
    { name: "Long run", newCategoryName: "Mains", durationMin: 75, cadence: "weekends", repeats: 1 },
    { name: "Read 20 pages", newCategoryName: "Sides", durationMin: 25, cadence: "daily", repeats: 1 },
    { name: "Tidy desk", newCategoryName: "Sides", durationMin: 10, cadence: "weekly", repeats: 2 },
    { name: "Call parents", newCategoryName: "Sides", durationMin: 20, cadence: "weekly", repeats: 1 },
    { name: "Review budget", newCategoryName: "Sides", durationMin: 30, cadence: "monthly", repeats: 1 },
    { name: "Stretch", newCategoryName: "Quick bites", durationMin: 5, cadence: "daily", repeats: 1 },
    { name: "Water plants", newCategoryName: "Quick bites", durationMin: 5, cadence: "biweekly", repeats: 2 },
    { name: "Back up laptop", newCategoryName: "Quick bites", durationMin: 10, cadence: "monthly", repeats: 1 },
    { name: "Dentist", newCategoryName: "Quick bites", durationMin: 60, cadence: "halfyearly", repeats: 1 },
    { name: "Renew passport check", newCategoryName: "Quick bites", durationMin: 10, cadence: "yearly", repeats: 1 },
  ];
  for (const r of rows) repo.createDish(r, today);
}
