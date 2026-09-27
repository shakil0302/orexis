import { Pressable, StyleSheet, type ViewStyle } from "react-native";
import { colors, radius } from "../theme";
import { T } from "./Text";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = "primary", disabled, style }: Props) {
  const textColor = variant === "primary" ? colors.onAccent : variant === "danger" ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "danger" && styles.danger,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <T variant="button" color={textColor}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 18, borderRadius: radius.control },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.subtle },
  danger: { backgroundColor: "transparent" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
});
