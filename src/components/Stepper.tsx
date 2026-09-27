import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, radius } from "../theme";
import { T } from "./Text";

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

export function Stepper({ value, min, max, onChange }: Props) {
  const dec = value > min;
  const inc = value < max;
  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => dec && onChange(value - 1)} style={styles.btn} accessibilityLabel="Fewer" hitSlop={6}>
        <Feather name="minus" size={18} color={dec ? colors.text : colors.border} />
      </Pressable>
      <T variant="button" style={styles.value}>
        {value}
      </T>
      <Pressable onPress={() => inc && onChange(value + 1)} style={styles.btn} accessibilityLabel="More" hitSlop={6}>
        <Feather name="plus" size={18} color={inc ? colors.text : colors.border} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.control,
    alignSelf: "flex-start",
  },
  btn: { paddingHorizontal: 14, paddingVertical: 9 },
  value: { minWidth: 36, textAlign: "center" },
});
