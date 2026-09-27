import { describeRule, formatLongDate, ruleSummary } from "./format";

describe("format", () => {
  test("formatLongDate", () => {
    expect(formatLongDate("2026-09-27")).toBe("Sunday 27 September");
    expect(formatLongDate("2027-01-01")).toBe("Friday 1 January");
  });

  test("ruleSummary", () => {
    expect(ruleSummary("daily", 1)).toBe("Daily");
    expect(ruleSummary("weekly", 1)).toBe("Weekly");
    expect(ruleSummary("weekly", 3)).toBe("3× weekly");
    expect(ruleSummary("halfyearly", 2)).toBe("2× half-yearly");
  });

  test("describeRule", () => {
    expect(describeRule("daily", 1)).toBe("On the menu every day.");
    expect(describeRule("weekly", 3)).toBe("On the menu each day until done 3 times this week. Once a day at most.");
    expect(describeRule("monthly", 1)).toBe("On the menu each day until done once this month. Returns next month.");
    expect(describeRule("weekends", 2)).toBe("On the menu Saturday and Sunday until done twice that weekend. Once a day at most.");
  });
});
