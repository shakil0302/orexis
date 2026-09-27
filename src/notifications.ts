import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { NOTIFICATION_CHANNEL, NOTIFICATION_HOUR, NOTIFICATION_MINUTE } from "./constants";

/**
 * Expo Go dropped notification support on Android in SDK 53, and merely
 * importing expo-notifications there throws. The module is therefore loaded
 * lazily and only outside Expo Go; the real app is a development or EAS build.
 */
export const notificationsAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

const CONTENT = { title: "Orexis", body: "Kitchen's open. What are you having today?" };

function loadNotifications(): typeof import("expo-notifications") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-notifications");
}

/** Permission and Android channel. Returns false when notifications can't be shown. */
async function prepare(): Promise<typeof import("expo-notifications") | null> {
  if (!notificationsAvailable) return null;
  const Notifications = loadNotifications();

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted && current.canAskAgain) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL, {
      name: "Daily order",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
    });
  }
  return Notifications;
}

/**
 * Asks for permission if needed and (re)schedules the single daily
 * notification. Called on every launch so it survives reboots, reinstalls,
 * and cleared app data. Tapping it opens the app, whose root route decides
 * between the order and today screens.
 */
export async function ensureDailyNotification(): Promise<boolean> {
  const Notifications = await prepare();
  if (!Notifications) return false;

  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: CONTENT,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: NOTIFICATION_HOUR,
      minute: NOTIFICATION_MINUTE,
      channelId: NOTIFICATION_CHANNEL,
    },
  });
  return true;
}

/**
 * Development helper: shows the morning notification a few seconds from now,
 * without touching the daily schedule. The delay leaves time to background
 * the app and see it arrive the way it would at 07:00.
 */
export async function sendTestNotification(delaySeconds = 5): Promise<boolean> {
  const Notifications = await prepare();
  if (!Notifications) return false;
  await Notifications.scheduleNotificationAsync({
    content: CONTENT,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delaySeconds,
      channelId: NOTIFICATION_CHANNEL,
    },
  });
  return true;
}
