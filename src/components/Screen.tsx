import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, space } from "../theme";
import { Muted, T } from "./Text";

interface Props {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  /** Pinned below the scrolling content. */
  footer?: ReactNode;
  scroll?: boolean;
}

export function Screen({ title, subtitle, right, children, footer, scroll = true }: Props) {
  const body = (
    <View style={styles.body}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <T variant="title">{title}</T>
          {subtitle ? <Muted style={{ marginTop: 2 }}>{subtitle}</Muted> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        body
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.page },
  scroll: { flexGrow: 1 },
  body: { flex: 1, paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.lg },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: space.md },
  footer: {
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.page,
  },
});
