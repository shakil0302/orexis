import { StyleSheet, View } from "react-native";
import { colors } from "../theme";
import { T } from "./Text";

export function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <T variant="tag" color={colors.accent}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { backgroundColor: colors.accentSubtle, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: "center" },
});
