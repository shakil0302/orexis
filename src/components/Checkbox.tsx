import { Feather } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { colors } from "../theme";

interface Props {
  checked: boolean;
  onChange?: (next: boolean) => void;
  size?: number;
}

export function Checkbox({ checked, onChange, size = 22 }: Props) {
  const scale = useRef(new Animated.Value(checked ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: checked ? 1 : 0, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  }, [checked, scale]);

  return (
    <Pressable
      onPress={onChange ? () => onChange(!checked) : undefined}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[styles.box, { width: size, height: size }, checked && styles.checked]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Feather name="check" size={size - 6} color={colors.onAccent} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.page,
  },
  checked: { backgroundColor: colors.accent, borderColor: colors.accent },
});
