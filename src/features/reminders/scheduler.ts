import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { remindersToSchedule, type ReminderConfig } from "@/src/features/reminders/reminders";

// Variante para Android e iOS: avisos locales programados en el teléfono. No
// usan internet ni ningún servidor; el sistema los dispara aunque la app esté cerrada.
export const remindersAvailable = true;
const CHANNEL = "meals";

/** Muestra los avisos también con la app abierta. Se llama una vez al iniciar. */
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Pide permiso para avisar. Devuelve si quedó concedido. */
export async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Reemplaza todos los avisos programados por los de la configuración.
 * Devuelve cuántos quedaron programados.
 */
export async function scheduleReminders(config: ReminderConfig): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const reminders = remindersToSchedule(config);
  if (!reminders.length) return 0;
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Recordatorios de comida",
      importance: Notifications.AndroidImportance.HIGH,
    });
  for (const reminder of reminders)
    await Notifications.scheduleNotificationAsync({
      content: { title: reminder.title, body: reminder.body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: reminder.weekday,
        hour: reminder.hour,
        minute: reminder.minute,
        channelId: CHANNEL,
      },
    });
  return reminders.length;
}
