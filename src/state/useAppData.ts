import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getRepo } from "../db/open";
import { localToday } from "../domain/dates";
import { loadAppData, type AppData } from "./appData";

const DATE_CHECK_MS = 60_000;

/**
 * Loads the day's data when the screen gains focus, whenever the app returns
 * to the foreground, and when the calendar date changes under an open screen.
 */
export function useAppData(): { data: AppData | null; reload: () => void } {
  const [data, setData] = useState<AppData | null>(null);
  const loadedFor = useRef<string | null>(null);

  const reload = useCallback(() => {
    const today = localToday();
    loadedFor.current = today;
    setData(loadAppData(getRepo(), today));
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") reload();
    });
    const timer = setInterval(() => {
      if (loadedFor.current !== null && loadedFor.current !== localToday()) reload();
    }, DATE_CHECK_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [reload]);

  return { data, reload };
}
