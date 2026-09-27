import { StyleSheet, View } from "react-native";
import { space } from "../theme";
import { Button } from "./Button";
import { Muted, T } from "./Text";

interface Props {
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
}

export function Empty({ title, body, action }: Props) {
  return (
    <View style={styles.wrap}>
      <T variant="body">{title}</T>
      {body ? <Muted style={{ marginTop: 4, textAlign: "center" }}>{body}</Muted> : null}
      {action ? <Button label={action.label} onPress={action.onPress} variant="secondary" style={{ marginTop: space.md }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: space.xl * 2 },
});
