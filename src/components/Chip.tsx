import { Pressable, StyleSheet, type ViewStyle } from "react-native";
import { colors, radius } from "../theme";
import { T } from "./Text";

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Chip({ label, selected, onPress, style }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.selected, style]} accessibilityRole="button" accessibilityState={{ selected }}>
      <T variant="meta" color={selected ? colors.page : colors.text}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.subtle,
  },
  selected: { backgroundColor: colors.text },
});
