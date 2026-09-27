import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { downloadBackup, pickBackup } from "../backup";
import { BottomSheet, Button, Empty, Field, IconButton, Input, Muted, Row, Screen, SectionHeader, showToast, T } from "../components";
import { getRepo } from "../db/open";
import { parseDocument } from "../db/model";
import { seedSampleMenu } from "../dev/seed";
import { addDays, getTodayOverride, localToday, setTodayOverride } from "../domain/dates";
import { formatMinutes } from "../domain/ordering";
import { ruleSummary } from "../domain/format";
import type { Category } from "../domain/types";
import { useAppData } from "../state/useAppData";
import { colors, space } from "../theme";

export default function MenuScreen() {
  const { data, reload } = useAppData();
  const [menuFor, setMenuFor] = useState<Category | null>(null);
  const [renaming, setRenaming] = useState<Category | null>(null);
  const [newName, setNewName] = useState("");
  const [pendingRestore, setPendingRestore] = useState<{ json: string; dishes: number; completions: number } | null>(null);

  if (!data) return null;

  const backUp = async () => {
    const ok = await downloadBackup(getRepo().exportJson(), `orexis-${data.today}.json`);
    showToast(ok ? "Backup saved" : "Backups are available in the web app");
  };

  const chooseRestore = async () => {
    const json = await pickBackup();
    if (json === null) return;
    try {
      const doc = parseDocument(json);
      setPendingRestore({ json, dishes: doc.dishes.length, completions: doc.completions.length });
    } catch {
      showToast("That file isn't an Orexis backup");
    }
  };

  const confirmRestore = () => {
    if (!pendingRestore) return;
    getRepo().importJson(pendingRestore.json);
    setPendingRestore(null);
    reload();
    showToast("Restored");
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const cats = [...data.categories].sort((a, b) => a.position - b.position);
  const dishCount = data.dishes.length;
  const subtitle = `${dishCount} ${dishCount === 1 ? "dish" : "dishes"} · ${cats.length} ${cats.length === 1 ? "category" : "categories"}`;

  const move = (dir: "up" | "down") => {
    if (!menuFor) return;
    getRepo().moveCategory(menuFor.id, dir);
    setMenuFor(null);
    reload();
  };

  const startRename = () => {
    if (!menuFor) return;
    setRenaming(menuFor);
    setNewName(menuFor.name);
    setMenuFor(null);
  };

  const saveRename = () => {
    if (!renaming || !newName.trim()) return;
    getRepo().renameCategory(renaming.id, newName);
    setRenaming(null);
    reload();
  };

  return (
    <Screen title="Menu" subtitle={subtitle} right={<IconButton icon="x" label="Close" onPress={close} />}>
      {dishCount === 0 ? (
        <Empty title="Add your first dish" body="Dishes are the activities you can order each morning." action={{ label: "Add dish", onPress: () => router.push("/dish/new") }} />
      ) : (
        cats.map((cat) => {
          const items = data.dishes
            .filter((d) => d.categoryId === cat.id)
            .sort((a, b) => (data.scores.get(b.id) ?? 0) - (data.scores.get(a.id) ?? 0) || a.name.localeCompare(b.name));
          return (
            <View key={cat.id}>
              <SectionHeader
                title={cat.name}
                right={
                  <Pressable onPress={() => setMenuFor(cat)} hitSlop={10} accessibilityLabel={`Options for ${cat.name}`}>
                    <Feather name="more-horizontal" size={18} color={colors.muted} />
                  </Pressable>
                }
              />
              {items.map((d) => (
                <Row key={d.id} onPress={() => router.push({ pathname: "/dish/[id]", params: { id: d.id } })}>
                  <View style={{ flex: 1 }}>
                    <T>{d.name}</T>
                    <Muted>{`${ruleSummary(d.cadence, d.repeats)} · ${formatMinutes(d.durationMin)}`}</Muted>
                  </View>
                  <Muted>{(data.scores.get(d.id) ?? 0).toFixed(1)}</Muted>
                </Row>
              ))}
              <Row onPress={() => router.push({ pathname: "/dish/new", params: { categoryId: cat.id } })} last>
                <Feather name="plus" size={16} color={colors.muted} />
                <Muted style={{ flex: 1 }}>Add dish</Muted>
              </Row>
            </View>
          );
        })
      )}

      <View style={styles.backup}>
        <SectionHeader title="Backup" />
        <Row onPress={backUp}>
          <Feather name="download" size={16} color={colors.muted} />
          <View style={{ flex: 1 }}>
            <T>Back up</T>
            <Muted>Saves everything as a file</Muted>
          </View>
        </Row>
        <Row onPress={chooseRestore} last>
          <Feather name="upload" size={16} color={colors.muted} />
          <View style={{ flex: 1 }}>
            <T>Restore</T>
            <Muted>Replaces everything with a backup file</Muted>
          </View>
        </Row>
      </View>

      <BottomSheet
        visible={pendingRestore !== null}
        onClose={() => setPendingRestore(null)}
        title="Restore this backup?"
        message={
          pendingRestore
            ? `It holds ${pendingRestore.dishes} ${pendingRestore.dishes === 1 ? "dish" : "dishes"} and ${pendingRestore.completions} ${pendingRestore.completions === 1 ? "completion" : "completions"}. Everything currently in the app is replaced.`
            : undefined
        }
      >
        <Button label="Restore" onPress={confirmRestore} />
        <Button label="Cancel" variant="secondary" onPress={() => setPendingRestore(null)} style={{ marginTop: space.sm }} />
      </BottomSheet>

      {__DEV__ ? (
        <View style={styles.dev}>
          <SectionHeader title={`Development · today is ${data.today}${getTodayOverride() ? " (overridden)" : ""}`} />
          <View style={styles.devRow}>
            <Button label="Seed sample menu" variant="secondary" onPress={() => { seedSampleMenu(getRepo(), data.today); reload(); }} />
            <Button label="Day +1" variant="secondary" onPress={() => { setTodayOverride(addDays(data.today, 1)); reload(); }} />
            <Button label="Real date" variant="secondary" onPress={() => { setTodayOverride(null); reload(); }} />
          </View>
          <Muted style={{ marginTop: space.sm }}>{`Real date: ${localToday(new Date()) === data.today ? "same" : "differs"}. Overrides clear on restart.`}</Muted>
        </View>
      ) : null}

      <BottomSheet visible={menuFor !== null} onClose={() => setMenuFor(null)} title={menuFor?.name}>
        <SheetAction label="Rename" onPress={startRename} />
        <SheetAction label="Move up" onPress={() => move("up")} />
        <SheetAction label="Move down" onPress={() => move("down")} />
      </BottomSheet>

      <BottomSheet visible={renaming !== null} onClose={() => setRenaming(null)} title="Rename category">
        <Field label="Name">
          <Input value={newName} onChangeText={setNewName} autoFocus onSubmitEditing={saveRename} returnKeyType="done" />
        </Field>
        <Button label="Save" onPress={saveRename} disabled={!newName.trim()} />
      </BottomSheet>
    </Screen>
  );
}

function SheetAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.subtle }]}>
      <T>{label}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: { paddingVertical: 14, paddingHorizontal: 4, borderRadius: 6 },
  backup: { marginTop: space.lg },
  dev: { marginTop: space.xl, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  devRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
