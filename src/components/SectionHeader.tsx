import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors, space } from "../theme";
import { T } from "./Text";

export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.wrap}>
      <T variant="section" color={colors.muted}>
        {title}
      </T>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.md, marginBottom: 4 },
});
