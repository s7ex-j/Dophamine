import { formatTime, parseTime } from "@/src/lib/time";

/**
 * Sueño: a qué hora se acostó, a qué hora despertó y cómo se sintió. La noche
 * se guarda con la fecha del día en que despierta. Módulo puro.
 *
 * `source` dice de dónde vino: escrito a mano o importado de Health Connect
 * (Samsung Health, Google Fit y otras apps que comparten ahí sus datos).
 */
export type SleepEntry = {
  id: string;
  date: string;
  bedtime: string;
  wakeTime: string;
  /** 1 (muy mal) a 5 (muy bien). Opcional. */
  quality: number | null;
  source: "manual" | "health";
};
export type SleepInput = Pick<SleepEntry, "bedtime" | "wakeTime" | "quality">;

export const SLEEP_GOAL_MINUTES = 8 * 60;
export const SLEEP_ENOUGH_MINUTES = 7 * 60;

/** Minutos dormidos entre dos horas. Si despierta "antes" de acostarse, cruzó la medianoche. */
export function sleepMinutes(bedtime: string, wakeTime: string): number | null {
  const bed = parseTime(bedtime);
  const wake = parseTime(wakeTime);
  if (bed === null || wake === null) return null;
  const minutes = wake - bed <= 0 ? wake - bed + 24 * 60 : wake - bed;
  return minutes;
}

/** Valida lo escrito. Devuelve el mensaje a mostrar o null si está bien. */
export function sleepError(input: SleepInput): string | null {
  const minutes = sleepMinutes(input.bedtime, input.wakeTime);
  if (minutes === null) return "Escribe las dos horas con el formato 23:30.";
  if (minutes < 60 || minutes > 16 * 60) return "Revisa las horas: la noche debe durar entre 1 y 16 horas.";
  if (input.quality !== null && !(input.quality >= 1 && input.quality <= 5)) return "La calidad va de 1 a 5.";
  return null;
}

// Una hora de acostarse en minutos contados desde el mediodía, para que 23:30 y 00:30 queden cerca.
const fromNoon = (time: string) => {
  const minutes = parseTime(time) ?? 0;
  return minutes < 12 * 60 ? minutes + 24 * 60 : minutes;
};

export type SleepSummary = {
  nights: number;
  averageMinutes: number | null;
  averageQuality: number | null;
  /** Hora media de acostarse. */
  averageBedtime: string | null;
  /** Cuánto varía la hora de acostarse (desviación en minutos). Menos es más regular. */
  bedtimeSpreadMinutes: number | null;
  /** Lo que faltó para la meta de 8 h, sumado en las noches registradas. */
  debtMinutes: number;
};

/** Resumen de las noches registradas (las más recientes `nights`). */
export function sleepSummary(entries: SleepEntry[], nights = 7): SleepSummary {
  const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, nights);
  const durations = recent.flatMap((entry) => {
    const minutes = sleepMinutes(entry.bedtime, entry.wakeTime);
    return minutes === null ? [] : [minutes];
  });
  const qualities = recent.flatMap((entry) => (entry.quality ? [entry.quality] : []));
  const bedtimes = recent.map((entry) => fromNoon(entry.bedtime));
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const bedMean = bedtimes.length ? mean(bedtimes) : null;
  return {
    nights: recent.length,
    averageMinutes: durations.length ? Math.round(mean(durations)) : null,
    averageQuality: qualities.length ? Math.round(mean(qualities) * 10) / 10 : null,
    averageBedtime: bedMean === null ? null : formatTime(bedMean),
    bedtimeSpreadMinutes:
      bedtimes.length >= 2 && bedMean !== null
        ? Math.round(Math.sqrt(mean(bedtimes.map((value) => (value - bedMean) ** 2))))
        : null,
    debtMinutes: durations.reduce((sum, minutes) => sum + Math.max(0, SLEEP_GOAL_MINUTES - minutes), 0),
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Comprueba la forma de una noche leída de un respaldo. */
export function isSleepEntry(value: unknown): value is SleepEntry {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    typeof value.bedtime === "string" &&
    typeof value.wakeTime === "string" &&
    sleepMinutes(value.bedtime, value.wakeTime) !== null &&
    (value.quality === null ||
      (typeof value.quality === "number" && value.quality >= 1 && value.quality <= 5)) &&
    (value.source === "manual" || value.source === "health")
  );
}
