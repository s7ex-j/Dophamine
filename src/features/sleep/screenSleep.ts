import type { SleepInput } from "@/src/features/sleep/sleep";

/**
 * Estimar la noche a partir de cuándo se apagó y encendió la pantalla del teléfono. Módulo puro.
 *
 * La noche que termina el día `date` se busca entre las 18:00 del día anterior y las 14:00 de ese
 * día: el tramo más largo con la pantalla apagada (al menos 3 horas) es el sueño. Un encendido corto
 * en medio (una notificación, mirar la hora) no corta la noche. Es una estimación: se puede corregir.
 */
export type ScreenEvent = { time: number; on: boolean };

const MINUTE = 60 * 1000;
const MIN_SLEEP_MS = 3 * 60 * MINUTE;
/** Un encendido de hasta esto en medio de la noche no la parte en dos. */
export const BRIEF_WAKE_MS = 10 * MINUTE;

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
  // Tramos con la pantalla apagada que terminan con un encendido (si sigue apagada, la noche no acabó).
  const dark: Array<{ from: number; to: number }> = [];
  let offSince: number | null = null;
  for (const event of sorted) {
    if (!event.on) offSince ??= event.time;
    else if (offSince !== null) {
      dark.push({ from: offSince, to: event.time });
      offSince = null;
    }
  }
  // Se unen los tramos separados por un encendido corto.
  const nights: Array<{ from: number; to: number }> = [];
  for (const stretch of dark) {
    const last = nights.at(-1);
    if (last && stretch.from - last.to <= BRIEF_WAKE_MS) last.to = stretch.to;
    else nights.push({ ...stretch });
  }
  const best = nights.reduce<{ from: number; to: number } | null>(
    (longest, night) => (!longest || night.to - night.from > longest.to - longest.from ? night : longest),
    null,
  );
  if (!best || best.to - best.from < MIN_SLEEP_MS) return null;
  return { bedtime: hhmm(best.from), wakeTime: hhmm(best.to), quality: null };
}

/** Qué hacer con la noche calculada: guardarla sola, preguntar antes o no usar el teléfono. */
export type AutoSleepMode = "save" | "ask" | "off";
export const AUTO_SLEEP_KEY = "sleep_from_phone";
export const AUTO_SLEEP_MODES: Array<{ value: AutoSleepMode; label: string }> = [
  { value: "save", label: "Guardar solo" },
  { value: "ask", label: "Preguntarme" },
  { value: "off", label: "No usar" },
];

/** El ajuste guardado: la fecha ya revisada sirve para no volver a calcular (ni a guardar lo que se quitó). */
export type AutoSleepSetting = { mode: AutoSleepMode; checked: string | null };

export function autoSleepSettingOf(value: unknown): AutoSleepSetting {
  const raw = (value ?? {}) as Partial<AutoSleepSetting>;
  const mode = AUTO_SLEEP_MODES.some((item) => item.value === raw.mode)
    ? (raw.mode as AutoSleepMode)
    : "save";
  return { mode, checked: typeof raw.checked === "string" ? raw.checked : null };
}

/** Si al abrir el Panel conviene calcular la noche de hoy con el teléfono. */
export function shouldCheckSleep({
  setting,
  date,
  today,
  hasAccess,
  hasNight,
}: {
  setting: AutoSleepSetting;
  date: string;
  today: string;
  hasAccess: boolean;
  hasNight: boolean;
}): boolean {
  return setting.mode !== "off" && hasAccess && date === today && !hasNight && setting.checked !== today;
}
