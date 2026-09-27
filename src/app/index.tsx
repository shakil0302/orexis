import { Redirect } from "expo-router";
import { getRepo } from "../db/open";
import { localToday } from "../domain/dates";

/** Entry point: today's list once an order exists, otherwise the order screen. */
export default function Index() {
  const hasOrder = getRepo().getOrder(localToday()) !== null;
  return <Redirect href={hasOrder ? "/today" : "/order"} />;
}
