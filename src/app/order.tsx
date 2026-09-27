import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Checkbox, Empty, IconButton, Muted, Row, Screen, SectionHeader, showToast, T, Tag } from "../components";
import { getRepo } from "../db/open";
import { formatLongDate } from "../domain/format";
import { formatMinutes } from "../domain/ordering";
import { useAppData } from "../state/useAppData";
import { space } from "../theme";

export default function OrderScreen() {
  const { data } = useAppData();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const availableIds = useMemo(() => new Set(data?.available.map((s) => s.dish.id) ?? []), [data]);
  const chosen = useMemo(() => data?.available.filter((s) => selected.has(s.dish.id) && availableIds.has(s.dish.id)) ?? [], [data, selected, availableIds]);
  const total = chosen.reduce((sum, s) => sum + s.dish.durationMin, 0);

  if (!data) return null;
  if (data.order) return <Redirect href="/today" />;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const place = () => {
    getRepo().placeOrder(data.today, chosen.map((s) => s.dish.id), new Date().toISOString());
    showToast("Order's in");
    router.replace("/today");
  };

  const editMenu = <IconButton icon="book-open" label="Edit menu" onPress={() => router.push("/menu")} />;

  let body;
  if (data.dishes.length === 0) {
    body = <Empty title="Add your first dish" body="Your menu is empty." action={{ label: "Add dish", onPress: () => router.push("/dish/new") }} />;
  } else if (data.available.length === 0) {
    body = <Empty title="Kitchen's closed today" body="Every dish is either done or not due." action={{ label: "Edit menu", onPress: () => router.push("/menu") }} />;
  } else {
    body = data.availableGroups.map((g) => (
      <View key={g.category.id}>
        <SectionHeader title={g.category.name} />
        {g.items.map((s, i) => {
          const on = selected.has(s.dish.id);
          return (
            <Row key={s.dish.id} onPress={() => toggle(s.dish.id)} last={i === g.items.length - 1}>
              <Checkbox checked={on} onChange={() => toggle(s.dish.id)} />
              <View style={styles.name}>
                <T>{s.dish.name}</T>
                {data.suggested.has(s.dish.id) ? <Tag label="Chef's pick" /> : null}
              </View>
              {s.repeats > 1 ? <Muted>{`${s.done} of ${s.repeats}`}</Muted> : null}
              <Muted>{formatMinutes(s.dish.durationMin)}</Muted>
            </Row>
          );
        })}
      </View>
    ));
  }

  const footer =
    data.available.length > 0 ? (
      <View>
        <View style={styles.totals}>
          <Muted>{chosen.length === 1 ? "1 item" : `${chosen.length} items`}</Muted>
          <T variant="title">{formatMinutes(total)}</T>
        </View>
        <Button label="Place order" onPress={place} />
      </View>
    ) : undefined;

  return (
    <Screen title="Order today" subtitle={formatLongDate(data.today)} right={editMenu} footer={footer}>
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" },
  totals: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: space.sm, paddingHorizontal: 2 },
});
