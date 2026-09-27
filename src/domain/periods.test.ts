import { addDays, dayOfWeek, daysSinceEpochMonday } from "./dates";
import { daysInPeriod, firstPeriodOnOrAfter, MAX_REPEATS, nextPeriod, periodContains, periodFor } from "./periods";
import { CADENCES } from "./types";

// 2026-09-27 is a Sunday.
const SUN = "2026-09-27";
const SAT = "2026-09-26";
const MON = "2026-09-28";
const WED = "2026-09-23";

describe("periodFor", () => {
  test("daily", () => {
    expect(periodFor("daily", SUN)).toEqual({ start: SUN, end: SUN });
  });

  test("weekdays: null on weekend, Mon-Fri on a weekday", () => {
    expect(periodFor("weekdays", SAT)).toBeNull();
    expect(periodFor("weekdays", SUN)).toBeNull();
    expect(periodFor("weekdays", WED)).toEqual({ start: "2026-09-21", end: "2026-09-25" });
    expect(periodFor("weekdays", MON)).toEqual({ start: MON, end: "2026-10-02" });
  });

  test("weekends: null on weekday, Sat-Sun on a weekend", () => {
    expect(periodFor("weekends", WED)).toBeNull();
    expect(periodFor("weekends", SAT)).toEqual({ start: SAT, end: SUN });
    expect(periodFor("weekends", SUN)).toEqual({ start: SAT, end: SUN });
  });

  test("weekly runs Monday to Sunday, including across New Year", () => {
    expect(periodFor("weekly", SUN)).toEqual({ start: "2026-09-21", end: SUN });
    expect(periodFor("weekly", MON)).toEqual({ start: MON, end: "2026-10-04" });
    expect(periodFor("weekly", "2027-01-01")).toEqual({ start: "2026-12-28", end: "2027-01-03" });
  });

  test("biweekly is 14 days from an epoch-aligned Monday", () => {
    const p = periodFor("biweekly", SUN)!;
    expect(dayOfWeek(p.start)).toBe(0);
    expect(daysInPeriod(p)).toBe(14);
    expect(periodContains(p, SUN)).toBe(true);
    expect(daysSinceEpochMonday(p.start) % 14).toBe(0);
    expect(p).toEqual({ start: "2026-09-14", end: "2026-09-27" });
    // Every date in a fortnight maps to the same period.
    for (let i = 0; i < 14; i++) expect(periodFor("biweekly", addDays(p.start, i))).toEqual(p);
    expect(periodFor("biweekly", addDays(p.end, 1))!.start).toBe(addDays(p.start, 14));
  });

  test("monthly, including leap February", () => {
    expect(periodFor("monthly", SUN)).toEqual({ start: "2026-09-01", end: "2026-09-30" });
    expect(periodFor("monthly", "2024-02-10")).toEqual({ start: "2024-02-01", end: "2024-02-29" });
  });

  test("quarterly", () => {
    expect(periodFor("quarterly", SUN)).toEqual({ start: "2026-07-01", end: "2026-09-30" });
    expect(periodFor("quarterly", "2026-11-15")).toEqual({ start: "2026-10-01", end: "2026-12-31" });
    expect(periodFor("quarterly", "2026-01-01")).toEqual({ start: "2026-01-01", end: "2026-03-31" });
  });

  test("halfyearly", () => {
    expect(periodFor("halfyearly", "2026-06-30")).toEqual({ start: "2026-01-01", end: "2026-06-30" });
    expect(periodFor("halfyearly", "2026-07-01")).toEqual({ start: "2026-07-01", end: "2026-12-31" });
  });

  test("yearly", () => {
    expect(periodFor("yearly", SUN)).toEqual({ start: "2026-01-01", end: "2026-12-31" });
  });
});

describe("firstPeriodOnOrAfter and nextPeriod", () => {
  test("weekdays from a Saturday jumps to Monday", () => {
    expect(firstPeriodOnOrAfter("weekdays", SAT)).toEqual({ start: MON, end: "2026-10-02" });
  });

  test("weekends from a Monday jumps to Saturday", () => {
    expect(firstPeriodOnOrAfter("weekends", MON)).toEqual({ start: "2026-10-03", end: "2026-10-04" });
  });

  test("nextPeriod chains without gaps or overlaps for every cadence", () => {
    for (const cadence of CADENCES) {
      let p = firstPeriodOnOrAfter(cadence, "2025-12-15");
      for (let i = 0; i < 40; i++) {
        const n = nextPeriod(cadence, p);
        expect(n.start > p.end).toBe(true);
        if (cadence !== "weekdays" && cadence !== "weekends") {
          expect(n.start).toBe(addDays(p.end, 1));
        }
        p = n;
      }
    }
  });

  test("weekdays and weekends alternate around each other", () => {
    const wd = firstPeriodOnOrAfter("weekdays", MON);
    const we = nextPeriod("weekends", firstPeriodOnOrAfter("weekends", SAT));
    expect(we.start).toBe(addDays(wd.end, 1));
  });
});

describe("MAX_REPEATS", () => {
  test("never exceeds the shortest instance of the period", () => {
    expect(MAX_REPEATS.daily).toBe(1);
    expect(MAX_REPEATS.weekdays).toBe(5);
    expect(MAX_REPEATS.weekends).toBe(2);
    expect(MAX_REPEATS.weekly).toBe(7);
    expect(MAX_REPEATS.biweekly).toBe(14);
    expect(MAX_REPEATS.monthly).toBe(28);
  });
});
