import { dayOfWeek, parseISODate } from "./dates";
import { CADENCE_LABEL, CADENCE_PERIOD_NOUN } from "./periods";
import type { Cadence, ISODate } from "./types";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Saturday 27 September" */
export function formatLongDate(iso: ISODate): string {
  const { m, d } = parseISODate(iso);
  return `${WEEKDAYS[dayOfWeek(iso)]} ${d} ${MONTHS[m - 1]}`;
}

/** Short rule label for the menu: "Daily", "3× weekly", "Monthly". */
export function ruleSummary(cadence: Cadence, repeats: number): string {
  const label = CADENCE_LABEL[cadence].toLowerCase();
  if (cadence === "daily" || repeats === 1) return CADENCE_LABEL[cadence];
  return `${repeats}× ${label}`;
}

function times(n: number): string {
  if (n === 1) return "once";
  if (n === 2) return "twice";
  return `${n} times`;
}

/** Plain-language preview shown on the dish form. */
export function describeRule(cadence: Cadence, repeats: number): string {
  const noun = CADENCE_PERIOD_NOUN[cadence];
  switch (cadence) {
    case "daily":
      return "On the menu every day.";
    case "weekdays":
      return `On the menu Monday to Friday until done ${times(repeats)} that week. Once a day at most.`;
    case "weekends":
      return `On the menu Saturday and Sunday until done ${times(repeats)} that weekend. Once a day at most.`;
    default:
      return repeats === 1
        ? `On the menu each day until done once this ${noun}. Returns next ${noun}.`
        : `On the menu each day until done ${times(repeats)} this ${noun}. Once a day at most.`;
  }
}
