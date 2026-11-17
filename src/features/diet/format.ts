import type { DietDay, DietItem, DietMeal, DietPlan } from "@/src/features/diet/diet";
import { parseTime } from "@/src/lib/time";

/**
 * El formato de archivo de dieta de Dophamine (`"format": "dophamine-diet"`).
 *
 * Un JSON con cuatro partes:
 * - `foods`: tus alimentos, cada uno con sus valores por 100 g (o 100 ml).
 * - `meals`: comidas armadas con esos alimentos y sus cantidades. Se pueden
 *   etiquetar `pre_gym` o `post_gym`.
 * - `week`: qué comidas tocan cada día (`mon`…`sun`), a qué hora, y la hora del
 *   gimnasio de ese día si entrenas.
 * - `targets`, `rules`, `notes`: metas del plan y recordatorios (opcionales).
 *
 * La plantilla de ejemplo está en `docs/formatos/`. Módulo puro.
 */
export const DIET_FORMAT = "dophamine-diet";
export const DIET_FORMAT_VERSION = 1;
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export const WEEKDAY_NAMES: Record<Weekday, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};
const MAX_MEALS = 6;

export class DietFormatError extends Error {}

type Raw = Record<string, unknown>;
const isRecord = (value: unknown): value is Raw =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const number = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;
const clock = (value: unknown) =>
  typeof value === "string" && parseTime(value) !== null ? value.padStart(5, "0") : null;

/** ¿El texto es un archivo con este formato? (para decidir cómo leerlo) */
export const isDietFile = (value: unknown): value is Raw => isRecord(value) && value.format === DIET_FORMAT;

/**
 * Convierte un archivo `dophamine-diet` en la dieta de la app. Lanza
 * DietFormatError con un mensaje que dice exactamente qué corregir.
 */
export function importDietFile(file: unknown, createdAt: string): DietPlan {
  if (!isDietFile(file)) throw new DietFormatError('El archivo no dice "format": "dophamine-diet".');
  if (number(file.version) !== null && (file.version as number) > DIET_FORMAT_VERSION)
    throw new DietFormatError("El archivo es de una versión más nueva del formato. Actualiza la app.");
  const foods = isRecord(file.foods) ? file.foods : null;
  const meals = isRecord(file.meals) ? file.meals : null;
  const week = isRecord(file.week) ? file.week : null;
  if (!foods || !meals || !week)
    throw new DietFormatError('Faltan partes: el archivo necesita "foods", "meals" y "week".');

  const itemOf = (entry: unknown, mealId: string): DietItem => {
    const reference = isRecord(entry) ? entry.food : null;
    const amount = isRecord(entry) ? number(entry.amount) : null;
    const food =
      typeof reference === "string" && isRecord(foods[reference]) ? (foods[reference] as Raw) : null;
    if (!food)
      throw new DietFormatError(
        `La comida "${mealId}" usa el alimento "${String(reference)}", que no está en "foods".`,
      );
    if (amount === null || amount <= 0)
      throw new DietFormatError(
        `En la comida "${mealId}", "${String(reference)}" no tiene una cantidad válida.`,
      );
    const kcal = number(food.kcal);
    const protein = number(food.protein_g);
    if (kcal === null || protein === null)
      throw new DietFormatError(
        `Al alimento "${String(reference)}" le faltan "kcal" o "protein_g" (por 100).`,
      );
    const factor = amount / 100;
    return {
      name: typeof food.name === "string" ? food.name : String(reference),
      grams: amount,
      kcal: Math.round(kcal * factor),
      proteinG: round(protein * factor),
      carbsG: round((number(food.carbs_g) ?? 0) * factor),
      fatsG: round((number(food.fat_g) ?? 0) * factor),
    };
  };

  const built = new Map<string, Pick<DietMeal, "label" | "items" | "tags">>();
  const mealOf = (id: unknown, weekday: Weekday) => {
    if (typeof id !== "string" || !isRecord(meals[id]))
      throw new DietFormatError(
        `${WEEKDAY_NAMES[weekday]} usa la comida "${String(id)}", que no está en "meals".`,
      );
    const cached = built.get(id);
    if (cached) return cached;
    const raw = meals[id] as Raw;
    const items = Array.isArray(raw.items) ? raw.items.map((entry) => itemOf(entry, id)) : [];
    if (!items.length) throw new DietFormatError(`La comida "${id}" no tiene alimentos.`);
    const tags = Array.isArray(raw.tags)
      ? raw.tags.filter((tag): tag is string => typeof tag === "string")
      : [];
    const meal = {
      label: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : id,
      items,
      ...(tags.length ? { tags } : {}),
    };
    built.set(id, meal);
    return meal;
  };

  const days = WEEKDAYS.flatMap((weekday): DietDay[] => {
    const raw = week[weekday];
    if (!isRecord(raw) || !Array.isArray(raw.meals) || !raw.meals.length) return [];
    if (raw.meals.length > MAX_MEALS)
      throw new DietFormatError(`${WEEKDAY_NAMES[weekday]} tiene más de ${MAX_MEALS} comidas.`);
    const dayMeals = raw.meals
      .map((entry, index) => {
        const slot = isRecord(entry) ? (number(entry.slot) ?? index + 1) : index + 1;
        const time = isRecord(entry) ? clock(entry.time) : null;
        return { slot, time, meal: mealOf(isRecord(entry) ? entry.meal : null, weekday) };
      })
      .sort((a, b) => a.slot - b.slot)
      .map(({ time, meal }, index): DietMeal => ({
        slot: `meal${index + 1}`,
        ...meal,
        ...(time ? { time } : {}),
      }));
    const start = isRecord(raw.gym) ? clock(raw.gym.start) : null;
    const end = isRecord(raw.gym) ? clock(raw.gym.end) : null;
    return [
      {
        kind: "any",
        weekday,
        meals: dayMeals,
        ...(start ? { gym: { start, ...(end ? { end } : {}) } } : {}),
      },
    ];
  });
  if (!days.length) throw new DietFormatError('"week" no tiene ningún día con comidas (mon, tue, …, sun).');

  const meta = isRecord(file.meta) ? file.meta : {};
  const targets = isRecord(file.targets) ? file.targets : null;
  const kcal = targets ? number(targets.kcal) : null;
  const rules = Array.isArray(file.rules)
    ? file.rules.filter((rule): rule is string => typeof rule === "string")
    : [];
  return {
    name: typeof meta.name === "string" && meta.name.trim() ? meta.name.trim() : "Mi dieta",
    createdAt,
    days,
    ...(kcal && targets
      ? {
          targets: {
            kcal,
            proteinG: number(targets.protein_g) ?? 0,
            carbsG: number(targets.carbs_g) ?? 0,
            fatsG: number(targets.fat_g) ?? 0,
          },
        }
      : {}),
    ...(rules.length ? { rules } : {}),
    ...(typeof file.notes === "string" && file.notes.trim() ? { notes: file.notes.trim() } : {}),
  };
}
