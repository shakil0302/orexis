import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheet, Button, Chip, Field, IconButton, Input, Muted, Screen, Stepper } from "../components";
import { getRepo } from "../db/open";
import { localToday } from "../domain/dates";
import { describeRule } from "../domain/format";
import { CADENCE_LABEL, CADENCE_PERIOD_NOUN, MAX_REPEATS } from "../domain/periods";
import { CADENCES, type Cadence, type Category, type Dish } from "../domain/types";
import { colors, radius, space } from "../theme";

interface Props {
  dishId?: string;
  initialCategoryId?: string;
}

const NEW = "__new__";

export function DishForm({ dishId, initialCategoryId }: Props) {
  const repo = getRepo();
  // Loaded once, synchronously, when the form mounts.
  const [categories] = useState<Category[]>(() => repo.listCategories());
  const [existing] = useState<Dish | null>(() => (dishId ? repo.getDish(dishId) : null));

  const [name, setName] = useState(existing?.name ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(
    existing?.categoryId ?? initialCategoryId ?? (categories.length === 0 ? NEW : null),
  );
  const [newCategory, setNewCategory] = useState("");
  const [duration, setDuration] = useState(existing ? String(existing.durationMin) : "");
  const [cadence, setCadence] = useState<Cadence>(existing?.cadence ?? "daily");
  const [repeats, setRepeats] = useState(existing?.repeats ?? 1);
  const [errors, setErrors] = useState<{ name?: string; category?: string; duration?: string }>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const max = MAX_REPEATS[cadence];
  const chooseCadence = (c: Cadence) => {
    setCadence(c);
    setRepeats((r) => Math.min(r, MAX_REPEATS[c]));
  };

  const preview = useMemo(() => describeRule(cadence, repeats), [cadence, repeats]);

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Enter a name";
    if (categoryId === null || (categoryId === NEW && !newCategory.trim())) e.category = "Choose or name a category";
    const mins = Number(duration);
    if (!duration.trim() || !Number.isInteger(mins) || mins <= 0) e.duration = "Enter whole minutes";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    const input = {
      name,
      categoryId: categoryId === NEW ? undefined : categoryId!,
      newCategoryName: categoryId === NEW ? newCategory : undefined,
      durationMin: Number(duration),
      cadence,
      repeats: cadence === "daily" ? 1 : repeats,
    };
    const today = localToday();
    if (existing) repo.updateDish(existing.id, input, today);
    else repo.createDish(input, today);
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    repo.deleteDish(existing.id, localToday());
    setConfirmDelete(false);
    router.back();
  };

  const close = <IconButton icon="x" label="Cancel" onPress={() => router.back()} />;

  return (
    <Screen title={existing ? "Edit dish" : "New dish"} right={close}>
      <Field label="Name" error={errors.name}>
        <Input value={name} onChangeText={setName} placeholder="Gym" autoFocus={!existing} returnKeyType="next" />
      </Field>

      <Field label="Category" error={errors.category}>
        <View style={styles.chips}>
          {categories.map((c) => (
            <Chip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
          ))}
          <Chip label="+ New" selected={categoryId === NEW} onPress={() => setCategoryId(NEW)} />
        </View>
        {categoryId === NEW ? (
          <Input value={newCategory} onChangeText={setNewCategory} placeholder="Category name" style={{ marginTop: space.sm }} autoFocus={categories.length > 0} />
        ) : null}
      </Field>

      <Field label="Duration" hint="minutes" error={errors.duration}>
        <Input value={duration} onChangeText={setDuration} placeholder="30" keyboardType="number-pad" />
      </Field>

      <Field label="How often">
        <View style={styles.chips}>
          {CADENCES.map((c) => (
            <Chip key={c} label={CADENCE_LABEL[c]} selected={cadence === c} onPress={() => chooseCadence(c)} />
          ))}
        </View>
      </Field>

      {cadence !== "daily" ? (
        <Field label={`Times per ${CADENCE_PERIOD_NOUN[cadence]}`} hint={`max ${max}`}>
          <Stepper value={repeats} min={1} max={max} onChange={setRepeats} />
        </Field>
      ) : null}

      <View style={styles.preview}>
        <Muted>{preview}</Muted>
      </View>

      <Button label={existing ? "Save" : "Add to menu"} onPress={save} style={{ marginTop: space.lg }} />

      {existing ? <Button label="Delete dish" variant="danger" onPress={() => setConfirmDelete(true)} style={{ marginTop: space.xl }} /> : null}

      <BottomSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${existing?.name ?? "dish"}?`}
        message="It comes off the menu and today's list. Its history is removed."
      >
        <Button label="Delete" onPress={remove} style={{ backgroundColor: colors.danger }} />
        <Button label="Cancel" variant="secondary" onPress={() => setConfirmDelete(false)} style={{ marginTop: space.sm }} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  preview: { backgroundColor: colors.subtle, borderRadius: radius.control, padding: 12 },
});
