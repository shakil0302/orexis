import Feather from "@expo/vector-icons/Feather";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet } from "react-native";
import { colors } from "../theme";

interface Props {
  icon: ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  label: string;
  size?: number;
}

/** Round hairline button for the top-right corner of a screen. */
export function IconButton({ icon, onPress, label, size = 36 }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.btn, { width: size, height: size, borderRadius: size / 2 }, pressed && styles.pressed]}
    >
      <Feather name={icon} size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.page,
  },
  pressed: { backgroundColor: colors.subtle },
});
