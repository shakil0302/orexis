import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { NOTIFICATION_CHANNEL, NOTIFICATION_HOUR, NOTIFICATION_MINUTE } from "./constants";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Asks for permission if needed and (re)schedules the single daily
 * notification. Called on every launch so it survives reboots, reinstalls,
 * and cleared app data. Tapping it opens the app, whose root route decides
 * between the order and today screens.
 */
export async function ensureDailyNotification(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted && current.canAskAgain) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL, {
      name: "Daily order",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: { title: "Orexis", body: "Your menu is ready. Plan today." },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: NOTIFICATION_HOUR,
      minute: NOTIFICATION_MINUTE,
      channelId: NOTIFICATION_CHANNEL,
    },
  });
  return true;
}
