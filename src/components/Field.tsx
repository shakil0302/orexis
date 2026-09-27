import type { ReactNode } from "react";
import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";
import { colors, fonts, radius, space } from "../theme";
import { Muted, T } from "./Text";

interface LabelProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** A labelled form field with optional right-aligned hint and inline error. */
export function Field({ label, hint, error, children }: LabelProps) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Muted>{label}</Muted>
        {hint ? <Muted>{hint}</Muted> : null}
      </View>
      {children}
      {error ? (
        <T variant="meta" color={colors.danger} style={{ marginTop: 4 }}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} />;
}

const styles = StyleSheet.create({
  field: { marginBottom: space.md },
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  input: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.page,
  },
});
