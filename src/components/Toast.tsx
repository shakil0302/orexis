import { useEffect, useState } from "react";
import { Animated, Platform, StyleSheet, ToastAndroid, View } from "react-native";
import { colors, radius, space } from "../theme";
import { T } from "./Text";

type Listener = (message: string) => void;
let listener: Listener | null = null;

/**
 * Shows a brief message. Native Android uses the system toast; everywhere
 * else the ToastHost rendered in the root layout shows it.
 */
export function showToast(message: string): void {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  listener?.(message);
}

const DURATION_MS = 2200;

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    listener = setMessage;
    return () => {
      if (listener === setMessage) listener = null;
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setMessage(null));
    }, DURATION_MS);
    return () => clearTimeout(timer);
  }, [message, opacity]);

  if (!message) return null;
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={[styles.toast, { opacity }]}>
        <T variant="meta" color={colors.page}>
          {message}
        </T>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: space.xl, alignItems: "center" },
  toast: { backgroundColor: colors.text, paddingHorizontal: space.md, paddingVertical: 10, borderRadius: radius.pill },
});
