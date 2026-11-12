import type { ReminderConfig } from "@/src/features/reminders/reminders";

// Variante web: el navegador no puede avisar con la página cerrada, así que los
// recordatorios solo existen en el teléfono.
export const remindersAvailable = false;

export function configureNotifications() {}

export async function requestPermission(): Promise<boolean> {
  return false;
}

export async function scheduleReminders(_config: ReminderConfig): Promise<number> {
  return 0;
}
