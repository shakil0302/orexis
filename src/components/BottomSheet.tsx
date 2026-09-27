import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { colors, radius, space } from "../theme";
import { Muted, T } from "./Text";

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  children: ReactNode;
}

export function BottomSheet({ visible, onClose, title, message, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        {title ? <T variant="title">{title}</T> : null}
        {message ? <Muted style={{ marginTop: 4, marginBottom: space.md }}>{message}</Muted> : null}
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(55, 53, 48, 0.35)" },
  sheet: {
    backgroundColor: colors.page,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.md,
    paddingTop: space.lg,
    paddingBottom: space.xl,
  },
});
