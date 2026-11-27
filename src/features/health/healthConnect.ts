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

export type HealthMeal = {
  start: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  /** La app que lo escribió en Health Connect. */
  source: string;
};
export type DaySteps = { date: string; steps: number };
export type DayFood = { date: string; kcal: number; proteinG: number; carbsG: number; fatsG: number };
/** El nombre de la entrada que guarda un total de antes de las comidas (`legacyDraft`). */
export const LEGACY_ENTRY_NAME = "Total registrado antes";

type Totals = { kcal: number; proteinG: number; carbsG: number; fatsG: number };
/** Lo guardado en un día que pudo dejar una importación a medias. */
export type StoredFood = {
  date: string;
  /** El total del día si no tiene comidas, o la entrada "Total registrado antes" si es la única de ese tipo. */
  totals: Totals;
  /** La entrada que guarda ese total, si existe (al agregar una comida, el total pasa a ser una entrada). */
  entryId?: string;
};
export type FoodRepair = { date: string; full: DayFood; entryId?: string };

const sameTotals = (stored: Totals, imported: Totals) =>
  stored.kcal === Math.round(imported.kcal) &&
  [
    [stored.proteinG, imported.proteinG],
    [stored.carbsG, imported.carbsG],
    [stored.fatsG, imported.fatsG],
  ].every(([a, b]) => Math.abs(a - round1(b)) < 0.06);

/**
 * Hasta la 0.42.0 la comida del día en curso se importaba a medias y ya no se completaba. Lo que quedó
 * guardado es exactamente la suma de las primeras comidas de una app en Health Connect (hasta la hora de
 * esa importación), pero no de todas. Eso identifica el dato: un total escrito a mano no coincide en
 * calorías y en los tres macros con la suma de una parte de las comidas de otra app. Devuelve el total
 * completo de ese día, de la misma app, para reemplazarlo.
 */
export function partialImports(meals: HealthMeal[], stored: StoredFood[], today: string): FoodRepair[] {
  const repairs: FoodRepair[] = [];
  for (const day of stored) {
    if (day.date >= today || day.totals.kcal <= 0) continue;
    const bySource = new Map<string, HealthMeal[]>();
    for (const meal of meals) {
      if (localDateKey(new Date(meal.start)) !== day.date) continue;
      bySource.set(meal.source, [...(bySource.get(meal.source) ?? []), meal]);
    }
    for (const list of bySource.values()) {
      const sorted = [...list].sort((a, b) => a.start.localeCompare(b.start));
      const sum = { kcal: 0, proteinG: 0, carbsG: 0, fatsG: 0 };
      let partial = false;
      sorted.slice(0, -1).forEach((meal, index) => {
        sum.kcal += meal.kcal;
        sum.proteinG += meal.proteinG;
        sum.carbsG += meal.carbsG;
        sum.fatsG += meal.fatsG;
        // Una comida a la misma hora que la siguiente entró junto con ella.
        if (sorted[index + 1].start !== meal.start && sameTotals(day.totals, sum)) partial = true;
      });
      if (!partial) continue;
      const [full] = foodToImport(sorted, new Set(), today);
      if (full && full.kcal > day.totals.kcal) repairs.push({ date: day.date, full, entryId: day.entryId });
      break;
    }
  }
  return repairs;
}

type Page<T> = { records: T[]; pageToken?: string };
/** Más páginas que esto en 30 días es un error de lectura, no datos. */
const MAX_PAGES = 200;

/**
 * Lee todas las páginas: Health Connect entrega hasta 1000 registros por vez. Si no llega al final, falla:
 * una lectura a medias no debe pasar por completa.
 */
export async function readAllPages<T>(
  read: (pageToken?: string) => Promise<Page<T>>,
  maxPages = MAX_PAGES,
): Promise<T[]> {
  const all: T[] = [];
  const seen = new Set<string>();
  let token: string | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    const result = await read(token);
    all.push(...result.records);
    if (!result.pageToken) return all;
    if (seen.has(result.pageToken)) break;
    seen.add(result.pageToken);
    token = result.pageToken;
  }
  throw new Error("Health Connect no entregó todos los datos. Vuelve a intentarlo más tarde.");
}

/** Inicio y fin de un día local, como instantes (sirve también en los cambios de hora). */
export function dayRange(date: string): { startTime: string; endTime: string } {
  const [year, month, day] = date.split("-").map(Number);
  return {
    startTime: new Date(year, month - 1, day).toISOString(),
    endTime: new Date(year, month - 1, day + 1).toISOString(),
  };
}

/** Los pasos de cada día a partir de su total (Health Connect ya descarta lo repetido entre apps). */
export function stepsToImport(totals: Array<{ date: string; total: number | null | undefined }>): DaySteps[] {
  return totals
    .flatMap(({ date, total }) => (total && total > 0 ? [{ date, steps: Math.round(total) }] : []))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Lo comido cada día según otras apps, solo en los días sin comida anotada en Dophamine. Si varias apps
 * anotaron el mismo día se usa una sola, la de más calorías: sumarlas contaría dos veces lo mismo.
 * El día en curso no entra: quedaría a medias y, al tener ya comida, no se completaría después.
 */
export function foodToImport(meals: HealthMeal[], daysWithFood: Set<string>, today: string): DayFood[] {
  const byDay = new Map<string, Map<string, DayFood>>();
  for (const meal of meals) {
    const date = localDateKey(new Date(meal.start));
    if (date >= today || daysWithFood.has(date)) continue;
    const sources = byDay.get(date) ?? new Map<string, DayFood>();
    const day = sources.get(meal.source) ?? { date, kcal: 0, proteinG: 0, carbsG: 0, fatsG: 0 };
    day.kcal += meal.kcal;
    day.proteinG += meal.proteinG;
    day.carbsG += meal.carbsG;
    day.fatsG += meal.fatsG;
    sources.set(meal.source, day);
    byDay.set(date, sources);
  }
  return [...byDay.values()]
    .map((sources) => [...sources.values()].reduce((best, day) => (day.kcal > best.kcal ? day : best)))
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
