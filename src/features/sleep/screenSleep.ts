import type { SleepInput } from "@/src/features/sleep/sleep";

/**
 * Estimar la noche a partir de cuándo se apagó y encendió la pantalla del teléfono. Módulo puro.
 *
 * La noche que termina el día `date` se busca entre las 18:00 del día anterior y las 14:00 de ese
 * día: el tramo más largo con la pantalla apagada (al menos 3 horas) es el sueño. Es una estimación:
 * la persona la revisa antes de guardarla.
 */
export type ScreenEvent = { time: number; on: boolean };

const MIN_SLEEP_MS = 3 * 60 * 60 * 1000;

const hhmm = (time: number) => {
  const date = new Date(time);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

/** La ventana en la que se busca la noche que termina en `date` (AAAA-MM-DD, hora local). */
export function nightWindow(date: string): { start: number; end: number } {
  const [year, month, day] = date.split("-").map(Number);
  return {
    start: new Date(year, month - 1, day - 1, 18, 0).getTime(),
    end: new Date(year, month - 1, day, 14, 0).getTime(),
  };
}

export function sleepFromScreen(events: ScreenEvent[], date: string, now = Date.now()): SleepInput | null {
  const window = nightWindow(date);
  const end = Math.min(window.end, now);
  const sorted = events
    .filter((event) => event.time >= window.start && event.time <= end)
    .sort((a, b) => a.time - b.time);
  let best: { from: number; to: number } | null = null;
  let offSince: number | null = null;
  for (const event of sorted) {
    if (!event.on) offSince ??= event.time;
    else if (offSince !== null) {
      if (!best || event.time - offSince > best.to - best.from) best = { from: offSince, to: event.time };
      offSince = null;
    }
  }
  if (!best || best.to - best.from < MIN_SLEEP_MS) return null;
  return { bedtime: hhmm(best.from), wakeTime: hhmm(best.to), quality: null };
}
