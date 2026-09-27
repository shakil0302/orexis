import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, space } from "../theme";

interface Props {
  children: ReactNode;
  onPress?: () => void;
  last?: boolean;
}

/** A list row separated from the next by a hairline. */
export function Row({ children, onPress, last }: Props) {
  const style = [styles.row, last && styles.last];
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [style, pressed && styles.pressed]} android_ripple={{ color: colors.subtle }}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm + 4,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  last: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  pressed: { backgroundColor: colors.subtle },
});
