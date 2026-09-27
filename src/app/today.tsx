import { Redirect, router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Checkbox, IconButton, Muted, Row, Screen, SectionHeader, T } from "../components";
import { getRepo } from "../db/open";
import { formatLongDate } from "../domain/format";
import { formatMinutes, groupByCategory } from "../domain/ordering";
import { useAppData } from "../state/useAppData";
import { colors, radius, space } from "../theme";

export default function TodayScreen() {
  const { data, reload } = useAppData();
  if (!data) return null;
  if (!data.order) return <Redirect href="/order" />;

  const orderedIds = new Set(data.orderItems.map((i) => i.dishId));
  const doneIds = new Set(data.completionsToday.map((c) => c.dishId));
  const ordered = data.statuses.filter((s) => orderedIds.has(s.dish.id));
  const groups = groupByCategory(data.categories, ordered, data.scores);
  const doneCount = ordered.filter((s) => doneIds.has(s.dish.id)).length;
  const remaining = ordered.filter((s) => !doneIds.has(s.dish.id)).reduce((sum, s) => sum + s.dish.durationMin, 0);
  const allDone = ordered.length > 0 && doneCount === ordered.length;

  const toggle = (dishId: string) => {
    const repo = getRepo();
    if (doneIds.has(dishId)) repo.uncomplete(data.today, dishId);
    else repo.complete(data.today, dishId, new Date().toISOString());
    reload();
  };

  const editMenu = <IconButton icon="book-open" label="Edit menu" onPress={() => router.push("/menu")} />;

  return (
    <Screen title="Today" subtitle={formatLongDate(data.today)} right={editMenu}>
      {ordered.length === 0 ? (
        <Muted style={{ marginTop: space.sm }}>Nothing ordered today.</Muted>
      ) : (
        groups.map((g) => (
          <View key={g.category.id}>
            <SectionHeader title={g.category.name} />
            {g.items.map((s, i) => {
              const done = doneIds.has(s.dish.id);
              return (
                <Row key={s.dish.id} onPress={() => toggle(s.dish.id)} last={i === g.items.length - 1}>
                  <Checkbox checked={done} onChange={() => toggle(s.dish.id)} />
                  <T style={[styles.name, done && styles.done]}>{s.dish.name}</T>
                  <Muted>{formatMinutes(s.dish.durationMin)}</Muted>
                </Row>
              );
            })}
          </View>
        ))
      )}

      <View style={styles.tiles}>
        <View style={styles.tile}>
          <Muted>Done</Muted>
          <T variant="title">{`${doneCount} / ${ordered.length}`}</T>
        </View>
        <View style={styles.tile}>
          <Muted>Remaining</Muted>
          <T variant="title">{formatMinutes(remaining)}</T>
        </View>
      </View>
      {allDone ? <Muted style={{ marginTop: space.md, textAlign: "center" }}>{"Kitchen's clean"}</Muted> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { flex: 1 },
  done: { textDecorationLine: "line-through", color: colors.muted },
  tiles: { flexDirection: "row", gap: space.sm, marginTop: space.lg },
  tile: { flex: 1, backgroundColor: colors.subtle, borderRadius: radius.control, padding: 12, gap: 2 },
});
