import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { getRepo } from "../db/open";
import { localToday } from "../domain/dates";
import { loadAppData, type AppData } from "./appData";

/**
 * Loads the day's data when the screen gains focus and whenever the app
 * returns to the foreground, so a date change while backgrounded is picked up.
 */
export function useAppData(): { data: AppData | null; reload: () => void } {
  const [data, setData] = useState<AppData | null>(null);
  const reload = useCallback(() => {
    setData(loadAppData(getRepo(), localToday()));
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
    return () => sub.remove();
  }, [reload]);

  return { data, reload };
}
