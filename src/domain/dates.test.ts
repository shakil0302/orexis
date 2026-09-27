import { addDays, dayOfWeek, daysBetween, daysInMonth, daysSinceEpochMonday, EPOCH_MONDAY, localToday, parseISODate } from "./dates";

describe("dates", () => {
  test("epoch Monday is a Monday", () => {
    expect(dayOfWeek(EPOCH_MONDAY)).toBe(0);
    expect(daysSinceEpochMonday(EPOCH_MONDAY)).toBe(0);
  });

  test("day of week", () => {
    expect(dayOfWeek("2026-09-27")).toBe(6); // Sunday
    expect(dayOfWeek("2026-09-28")).toBe(0); // Monday
    expect(dayOfWeek("2026-09-26")).toBe(5); // Saturday
  });

  test("addDays across month, year, and leap day", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-09-27", 0)).toBe("2026-09-27");
  });

  test("daysBetween", () => {
    expect(daysBetween("2026-09-20", "2026-09-27")).toBe(7);
    expect(daysBetween("2026-09-27", "2026-09-20")).toBe(-7);
    expect(daysBetween("2025-01-01", "2026-01-01")).toBe(365);
    expect(daysBetween("2024-01-01", "2025-01-01")).toBe(366);
  });

  test("daysInMonth", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  test("parseISODate rejects garbage", () => {
    expect(() => parseISODate("27/09/2026")).toThrow();
    expect(parseISODate("2026-09-27")).toEqual({ y: 2026, m: 9, d: 27 });
  });

  test("localToday uses local components, not UTC", () => {
    const late = new Date(2026, 8, 27, 23, 30); // local 23:30 on 27 Sep
    expect(localToday(late)).toBe("2026-09-27");
    const early = new Date(2026, 8, 28, 0, 15);
    expect(localToday(early)).toBe("2026-09-28");
  });
});
