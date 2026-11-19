import { localDateKey } from "@/src/lib/dates";

/**
 * Health Connect (Samsung Health, Google Fit y otras apps del teléfono): qué se importa y a qué
 * día va cada dato. Módulo puro; la lectura está en `healthConnect.repository.ts`.
 *
 * Reglas: lo que la persona anotó a mano gana siempre (solo se llenan días vacíos); de varios
 * pesajes en un día se toma el primero (el de la mañana, como pide la app); una noche cuenta para
 * el día en que se despierta.
 */
export const IMPORT_DAYS = 30;

export type HealthWeight = { time: string; kg: number };
export type HealthBodyFat = { time: string; pct: number };
export type HealthSleep = { start: string; end: string };

export type DayBody = { date: string; weightKg: number; bodyFatPct: number | null };
export type Night = { date: string; bedtime: string; wakeTime: string };

const hhmm = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
const round1 = (value: number) => Math.round(value * 10) / 10;

/** El primer pesaje de cada día que todavía no tiene peso, con la grasa de ese día si hay. */
export function weightsToImport(
  weights: HealthWeight[],
  bodyFat: HealthBodyFat[],
  daysWithWeight: Set<string>,
): DayBody[] {
  const firstOfDay = new Map<string, HealthWeight>();
  for (const weight of [...weights].sort((a, b) => a.time.localeCompare(b.time))) {
    if (!(weight.kg > 20 && weight.kg < 400)) continue;
    const date = localDateKey(new Date(weight.time));
    if (!daysWithWeight.has(date) && !firstOfDay.has(date)) firstOfDay.set(date, weight);
  }
  const fatByDay = new Map<string, number>();
  for (const fat of [...bodyFat].sort((a, b) => a.time.localeCompare(b.time))) {
    const date = localDateKey(new Date(fat.time));
    if (fat.pct > 2 && fat.pct < 70 && !fatByDay.has(date)) fatByDay.set(date, fat.pct);
  }
  return [...firstOfDay.entries()]
    .map(([date, weight]) => ({
      date,
      weightKg: round1(weight.kg),
      bodyFatPct: fatByDay.has(date) ? round1(fatByDay.get(date) ?? 0) : null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** La noche más larga de cada día (por la hora de despertar) que todavía no tiene sueño anotado. */
export function nightsToImport(sleeps: HealthSleep[], daysWithSleep: Set<string>): Night[] {
  const longest = new Map<string, { night: Night; minutes: number }>();
  for (const sleep of sleeps) {
    const start = new Date(sleep.start);
    const end = new Date(sleep.end);
    const minutes = (end.getTime() - start.getTime()) / 60000;
    // Una siesta corta o un registro roto no es una noche.
    if (!(minutes >= 120 && minutes <= 16 * 60)) continue;
    const date = localDateKey(end);
    if (daysWithSleep.has(date)) continue;
    const current = longest.get(date);
    if (!current || minutes > current.minutes)
      longest.set(date, { night: { date, bedtime: hhmm(start), wakeTime: hhmm(end) }, minutes });
  }
  return [...longest.values()].map((item) => item.night).sort((a, b) => a.date.localeCompare(b.date));
}

export type HealthSteps = { start: string; count: number };
export type HealthMeal = { start: string; kcal: number; proteinG: number; carbsG: number; fatsG: number };
export type DaySteps = { date: string; steps: number };
export type DayFood = { date: string; kcal: number; proteinG: number; carbsG: number; fatsG: number };

/** Los pasos de cada día, sumados por el día en que empezó cada tramo. */
export function stepsByDay(steps: HealthSteps[]): DaySteps[] {
  const totals = new Map<string, number>();
  for (const item of steps) {
    if (!(item.count > 0)) continue;
    const date = localDateKey(new Date(item.start));
    totals.set(date, (totals.get(date) ?? 0) + item.count);
  }
  return [...totals.entries()]
    .map(([date, total]) => ({ date, steps: Math.round(total) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Lo comido cada día según otras apps, solo en los días sin comida anotada en Dophamine: así un día
 * registrado aquí nunca se suma dos veces.
 */
export function foodToImport(meals: HealthMeal[], daysWithFood: Set<string>): DayFood[] {
  const totals = new Map<string, DayFood>();
  for (const meal of meals) {
    const date = localDateKey(new Date(meal.start));
    if (daysWithFood.has(date)) continue;
    const day = totals.get(date) ?? { date, kcal: 0, proteinG: 0, carbsG: 0, fatsG: 0 };
    day.kcal += meal.kcal;
    day.proteinG += meal.proteinG;
    day.carbsG += meal.carbsG;
    day.fatsG += meal.fatsG;
    totals.set(date, day);
  }
  return [...totals.values()]
    .filter((day) => day.kcal > 0)
    .map((day) => ({
      date: day.date,
      kcal: Math.round(day.kcal),
      proteinG: round1(day.proteinG),
      carbsG: round1(day.carbsG),
      fatsG: round1(day.fatsG),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
