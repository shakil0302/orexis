import { fireEvent, render, screen } from "@testing-library/react-native";
import { resetRepo, routerMock, setSearchParams } from "../test/mocks";
import * as dates from "../domain/dates";
import MenuScreen from "../app/menu";
import OrderScreen from "../app/order";
import TodayScreen from "../app/today";
import { DishForm } from "./DishForm";
import * as backup from "../backup";

jest.mock("../backup", () => ({
  downloadBackup: jest.fn(async () => true),
  pickBackup: jest.fn(async () => null),
}));

const TODAY = "2026-09-23"; // Wednesday
let repo: ReturnType<typeof resetRepo>;

beforeEach(() => {
  repo = resetRepo();
  jest.spyOn(dates, "localToday").mockReturnValue(TODAY);
  routerMock.push.mockClear();
  routerMock.replace.mockClear();
  routerMock.back.mockClear();
  setSearchParams({});
});

function seed() {
  const gym = repo.createDish({ name: "Gym", newCategoryName: "Mains", durationMin: 60, cadence: "weekly", repeats: 3 }, "2026-09-14");
  const read = repo.createDish({ name: "Read", newCategoryName: "Sides", durationMin: 25, cadence: "daily", repeats: 1 }, "2026-09-14");
  const weekend = repo.createDish({ name: "Long run", newCategoryName: "Mains", durationMin: 75, cadence: "weekends", repeats: 1 }, "2026-09-14");
  return { gym, read, weekend };
}

describe("OrderScreen", () => {
  test("empty menu shows the first-dish prompt", async () => {
    await render(<OrderScreen />);
    expect(screen.getByText("Add your first dish")).toBeTruthy();
    await fireEvent.press(screen.getByText("Add dish"));
    expect(routerMock.push).toHaveBeenCalledWith("/dish/new");
  });

  test("lists available dishes by category, totals the selection, and places the order", async () => {
    const { gym, read } = seed();
    await render(<OrderScreen />);
    expect(screen.getByText("Mains")).toBeTruthy();
    expect(screen.getByText("Gym")).toBeTruthy();
    expect(screen.getByText("Read")).toBeTruthy();
    expect(screen.queryByText("Long run")).toBeNull(); // weekends dish on a Wednesday
    expect(screen.getByText("0 items")).toBeTruthy();

    await fireEvent.press(screen.getByText("Gym"));
    await fireEvent.press(screen.getByText("Read"));
    expect(screen.getByText("2 items")).toBeTruthy();
    expect(screen.getByText("1 h 25 min")).toBeTruthy();

    await fireEvent.press(screen.getByText("Place order"));
    expect(repo.getOrder(TODAY)).not.toBeNull();
    expect(repo.listOrderItems(TODAY).map((i) => i.dishId).sort()).toEqual([gym.id, read.id].sort());
    expect(routerMock.replace).toHaveBeenCalledWith("/today");
  });

  test("shows the Suggested tag on the top-scoring dish of a category", async () => {
    seed();
    // Every dish has closed periods since 14 Sep with nothing ordered, so each category has a top scorer:
    // Mains -> Gym (1.5) over Long run (0.5); Sides -> Read (4.5).
    await render(<OrderScreen />);
    expect(screen.getAllByText("Chef's pick")).toHaveLength(2);
  });

  test("redirects to today once an order exists", async () => {
    const { read } = seed();
    repo.placeOrder(TODAY, [read.id], "x");
    await render(<OrderScreen />);
    expect(screen.getByText("redirect:/today")).toBeTruthy();
  });
});

describe("TodayScreen", () => {
  test("redirects to order when nothing was ordered", async () => {
    seed();
    await render(<TodayScreen />);
    expect(screen.getByText("redirect:/order")).toBeTruthy();
  });

  test("ticks a dish done and updates the tiles", async () => {
    const { gym, read } = seed();
    repo.placeOrder(TODAY, [gym.id, read.id], "x");
    await render(<TodayScreen />);
    expect(screen.getByText("0 / 2")).toBeTruthy();
    expect(screen.getByText("1 h 25 min")).toBeTruthy();

    await fireEvent.press(screen.getByText("Gym"));
    expect(repo.listCompletions(TODAY)).toHaveLength(1);
    expect(screen.getByText("1 / 2")).toBeTruthy();
    // Read's row duration and the Remaining tile now both read 25 min.
    expect(screen.getAllByText("25 min")).toHaveLength(2);

    await fireEvent.press(screen.getByText("Read"));
    expect(screen.getByText("Kitchen's clean")).toBeTruthy();

    await fireEvent.press(screen.getByText("Gym")); // untick
    expect(repo.listCompletions(TODAY)).toHaveLength(1);
    expect(screen.queryByText("Kitchen's clean")).toBeNull();
  });
});

describe("MenuScreen", () => {
  test("Back up hands the document to the download helper", async () => {
    seed();
    await render(<MenuScreen />);
    await fireEvent.press(screen.getByText("Back up"));
    expect(backup.downloadBackup).toHaveBeenCalledWith(repo.exportJson(), `orexis-${TODAY}.json`);
  });

  test("Restore asks for confirmation, then replaces everything", async () => {
    const { gym } = seed();
    const snapshot = repo.exportJson();
    repo.deleteDish(gym.id, TODAY);
    jest.mocked(backup.pickBackup).mockResolvedValueOnce(snapshot);
    await render(<MenuScreen />);
    await fireEvent.press(screen.getByText("Restore"));
    expect(await screen.findByText("Restore this backup?")).toBeTruthy();
    expect(screen.getByText(/holds 3 dishes and 0 completions/)).toBeTruthy();
    await fireEvent.press(screen.getAllByText("Restore")[1]);
    expect(repo.getDish(gym.id)?.name).toBe("Gym");
  });

  test("Restore rejects a file that is not a backup", async () => {
    seed();
    jest.mocked(backup.pickBackup).mockResolvedValueOnce("{\"nope\":1}");
    await render(<MenuScreen />);
    await fireEvent.press(screen.getByText("Restore"));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText("Restore this backup?")).toBeNull();
    expect(repo.listDishes()).toHaveLength(3);
  });

  test("lists categories with dishes, rule summary, and deficiency", async () => {
    seed();
    await render(<MenuScreen />);
    expect(screen.getByText("3 dishes · 2 categories")).toBeTruthy();
    expect(screen.getByText("3× weekly · 1 h")).toBeTruthy();
    expect(screen.getByText("Daily · 25 min")).toBeTruthy();
    // Read, daily: 9 past days (14–22 Sep) never ordered = 4.5. Gym, weekly x3: full week 1.5 plus Mon and Tue at 3/7 each = 1.9. Long run: one weekend = 0.5.
    expect(screen.getByText("4.5")).toBeTruthy();
    expect(screen.getByText("1.9")).toBeTruthy();
    expect(screen.getByText("0.5")).toBeTruthy();
  });

  test("category options: move down and rename", async () => {
    seed();
    await render(<MenuScreen />);
    await fireEvent.press(screen.getByLabelText("Options for Mains"));
    await fireEvent.press(screen.getByText("Move down"));
    expect(repo.listCategories().map((c) => c.name)).toEqual(["Sides", "Mains"]);

    await fireEvent.press(screen.getByLabelText("Options for Sides"));
    await fireEvent.press(screen.getByText("Rename"));
    await fireEvent.changeText(screen.getByDisplayValue("Sides"), "Starters");
    await fireEvent.press(screen.getByText("Save"));
    expect(repo.listCategories().map((c) => c.name)).toEqual(["Starters", "Mains"]);
  });

  test("opens the dish editor and the add form", async () => {
    const { gym } = seed();
    await render(<MenuScreen />);
    await fireEvent.press(screen.getByText("Gym"));
    expect(routerMock.push).toHaveBeenCalledWith({ pathname: "/dish/[id]", params: { id: gym.id } });
    await fireEvent.press(screen.getAllByText("Add dish")[0]);
    expect(routerMock.push).toHaveBeenCalledWith({ pathname: "/dish/new", params: { categoryId: gym.categoryId } });
  });
});

describe("DishForm", () => {
  test("validates and creates a dish in a new category", async () => {
    await render(<DishForm />);
    await fireEvent.press(screen.getByText("Add to menu"));
    expect(screen.getByText("Enter a name")).toBeTruthy();
    expect(screen.getByText("Choose or name a category")).toBeTruthy();
    expect(screen.getByText("Enter whole minutes")).toBeTruthy();

    await fireEvent.changeText(screen.getByPlaceholderText("Gym"), "Stretch");
    await fireEvent.changeText(screen.getByPlaceholderText("Category name"), "Quick bites");
    await fireEvent.changeText(screen.getByPlaceholderText("30"), "5");
    await fireEvent.press(screen.getByText("Weekly"));
    expect(screen.getByText("max 7")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("More"));
    await fireEvent.press(screen.getByLabelText("More"));
    expect(screen.getByText("On the menu each day until done 3 times this week. Once a day at most.")).toBeTruthy();

    await fireEvent.press(screen.getByText("Add to menu"));
    const [d] = repo.listDishes();
    expect(d).toMatchObject({ name: "Stretch", durationMin: 5, cadence: "weekly", repeats: 3 });
    expect(repo.listCategories()[0].name).toBe("Quick bites");
    expect(routerMock.back).toHaveBeenCalled();
  });

  test("repeats clamp when switching to a smaller cadence", async () => {
    await render(<DishForm />);
    await fireEvent.press(screen.getByText("Weekly"));
    for (let i = 0; i < 6; i++) await fireEvent.press(screen.getByLabelText("More"));
    expect(screen.getByText("7")).toBeTruthy();
    await fireEvent.press(screen.getByText("Weekends"));
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("max 2")).toBeTruthy();
  });

  test("edits an existing dish", async () => {
    const { gym } = seed();
    await render(<DishForm dishId={gym.id} />);
    expect(screen.getByText("Edit dish")).toBeTruthy();
    await fireEvent.changeText(screen.getByDisplayValue("Gym"), "Gym session");
    await fireEvent.press(screen.getByText("Save"));
    expect(repo.getDish(gym.id)?.name).toBe("Gym session");
    expect(routerMock.back).toHaveBeenCalled();
  });

  test("deletes a dish after confirmation", async () => {
    const { gym } = seed();
    await render(<DishForm dishId={gym.id} />);
    await fireEvent.press(screen.getByText("Delete dish"));
    expect(screen.getByText("Delete Gym?")).toBeTruthy();
    await fireEvent.press(screen.getByText("Delete"));
    expect(repo.getDish(gym.id)).toBeNull();
    expect(repo.listCategories().map((c) => c.name)).toEqual(["Mains", "Sides"]); // Long run keeps Mains alive
    expect(routerMock.back).toHaveBeenCalled();
  });
});
