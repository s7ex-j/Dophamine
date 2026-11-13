// Horas del día como texto "HH:MM" y como minutos desde la medianoche.

const MINUTES_PER_DAY = 24 * 60;

/** "7:30", "0730", "07.30" o "7" → minutos desde la medianoche. null si no es una hora válida. */
export function parseTime(text: string): number | null {
  const clean = text.trim().replace(/[.h]/gi, ":");
  const match = clean.includes(":")
    ? clean.match(/^(\d{1,2}):(\d{1,2})$/)
    : clean.match(/^(\d{1,2})(\d{2})?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  return hour <= 23 && minute <= 59 ? hour * 60 + minute : null;
}

export const formatTime = (minutes: number) => {
  const value = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
};

/** La hora escrita en formato HH:MM, o null si no es válida. */
export const normalizeTime = (text: string) => {
  const minutes = parseTime(text);
  return minutes === null ? null : formatTime(minutes);
};

/** 450 → "7 h 30 min"; 60 → "1 h". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
