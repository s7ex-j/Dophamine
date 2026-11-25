import { isFood } from "@/src/features/nutrition/foods";
import { isMealEntry } from "@/src/features/nutrition/meals";
import { isWeeklyReview } from "@/src/features/reviews/reviews";
import { isSleepEntry } from "@/src/features/sleep/sleep";

/**
 * Qué datos acepta un respaldo, igual en el teléfono y en la web. Los rangos son los mismos que exige
 * la base del teléfono (`src/db/database.ts`): lo que aquí pasa, ahí entra. Módulo puro.
 */
type Data = Record<string, unknown>;

const isRecord = (value: unknown): value is Data =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === "string";
const isId = (value: unknown) => isText(value) && value.length > 0;
const between = (value: unknown, min: number, max = Number.POSITIVE_INFINITY) =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
const absent = (value: unknown) => value === undefined || value === null;
/** Puede faltar; si está, debe cumplir. */
const maybe = (value: unknown, min: number, max?: number) => absent(value) || between(value, min, max);
const oneOf = (value: unknown, options: unknown[]) => options.includes(value);
const maybeOneOf = (value: unknown, options: unknown[]) => absent(value) || oneOf(value, options);
const maybeFlag = (value: unknown) => absent(value) || typeof value === "boolean";
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** Empieza con una fecha que existe en el calendario. */
export function isRealDate(value: unknown): value is string {
  const match = isText(value) ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
const isDay = (value: unknown) => isRealDate(value) && value.length === 10;
// Sin `Date.parse`: el teléfono no entiende todos los formatos con los que se guardó una hora
// ("2026-11-20", "2026-11-20 10:00:00" o ISO con zona).
const CLOCK = /^[T ]([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?(Z|[+-]([01]\d|2[0-3]):?[0-5]\d)?$/;
const isMoment = (value: unknown) =>
  isRealDate(value) && (value.length === 10 || CLOCK.test(value.slice(10)));
const isRir = (value: unknown) => absent(value) || between(value, -10, 20);

const biometrics = (item: unknown) =>
  isRecord(item) &&
  isId(item.id) &&
  isDay(item.date) &&
  (item.weightKg === null || (between(item.weightKg, 0, 1000) && (item.weightKg as number) > 0)) &&
  between(item.caloriesIn, 0) &&
  between(item.proteinG, 0) &&
  maybe(item.carbsG, 0) &&
  maybe(item.fatsG, 0) &&
  maybe(item.bodyFatPct, 0, 100) &&
  maybe(item.waterPct, 0, 100) &&
  maybe(item.muscleMassKg, 0) &&
  maybe(item.boneMassKg, 0) &&
  maybe(item.waterMl, 0) &&
  maybe(item.steps, 0) &&
  maybeFlag(item.partial) &&
  maybeFlag(item.fasting);

const wellbeing = (item: unknown) =>
  isRecord(item) &&
  isId(item.id) &&
  isMoment(item.date) &&
  between(item.mood, 1, 5) &&
  maybe(item.energy, 1, 5) &&
  maybe(item.stress, 1, 5) &&
  maybe(item.sleepHours, 0, 24) &&
  (absent(item.note) || isText(item.note));

const set = (item: unknown) =>
  isRecord(item) &&
  isText(item.exerciseName) &&
  between(item.setNumber, 1) &&
  isText(item.type) &&
  maybe(item.loadKg, 0) &&
  maybe(item.reps, 0) &&
  isRir(item.rir) &&
  (absent(item.exerciseId) || isText(item.exerciseId)) &&
  maybeOneOf(item.side, ["left", "right"]);

const sessionLog = (item: unknown) =>
  isRecord(item) &&
  isText(item.exerciseName) &&
  maybe(item.loadKg, 0) &&
  maybe(item.reps, 0) &&
  isRir(item.rir);

const workout = (item: unknown) =>
  isRecord(item) &&
  isId(item.id) &&
  isText(item.name) &&
  isMoment(item.completedAt) &&
  (absent(item.startedAt) || isMoment(item.startedAt)) &&
  (absent(item.sets) || (Array.isArray(item.sets) && item.sets.every(set))) &&
  (absent(item.sessionLogs) || (Array.isArray(item.sessionLogs) && item.sessionLogs.every(sessionLog)));

const habit = (item: unknown) =>
  isRecord(item) && isId(item.id) && isDay(item.date) && typeof item.completed === "boolean";

// Las rutinas se aceptan con todas las formas que entiende `normalizeRoutine`: antes de la 0.14.0 no
// había entrenos por día, y las primeras guardaban los ejercicios como texto.
const plannedExercise = (item: unknown) =>
  isText(item) ||
  (isRecord(item) &&
    isText(item.name) &&
    maybe(item.sets, 0) &&
    (absent(item.reps) || isText(item.reps) || between(item.reps, 0)) &&
    isRir(item.rir));
const maybeExercises = (value: unknown) =>
  absent(value) || (Array.isArray(value) && value.every(plannedExercise));
const plannedDay = (item: unknown) =>
  isRecord(item) && (absent(item.day) || isText(item.day)) && maybeExercises(item.exercises);

const routine = (item: unknown) =>
  isRecord(item) &&
  isText(item.name) &&
  (absent(item.days) || (Array.isArray(item.days) && item.days.every(isText))) &&
  (Array.isArray(item.exercises) || Array.isArray(item.schedule)) &&
  maybeExercises(item.exercises) &&
  (absent(item.schedule) || (Array.isArray(item.schedule) && item.schedule.every(plannedDay))) &&
  maybe(item.sessionMinutes, 0);

const profile = (item: unknown) =>
  isRecord(item) &&
  between(item.age, 1, 130) &&
  oneOf(item.sex, ["female", "male"]) &&
  between(item.heightCm, 50, 280) &&
  oneOf(item.activity, ["low", "light", "moderate", "high"]) &&
  oneOf(item.goal, ["gain", "maintain", "lose"]) &&
  between(item.calorieTarget, 1) &&
  between(item.proteinTarget, 0) &&
  between(item.carbsTarget, 0) &&
  between(item.fatsTarget, 0) &&
  maybeOneOf(item.weightUnit, ["kg", "lb"]) &&
  maybe(item.startWeightKg, 1) &&
  maybe(item.goalWeightKg, 1) &&
  maybeOneOf(item.adjustMode, ["auto", "collaborative", "manual"]) &&
  maybeOneOf(item.checkInDays, [3, 7]) &&
  maybeOneOf(item.pace, ["gentle", "moderate", "fast"]) &&
  (absent(item.startDate) || isDay(item.startDate)) &&
  maybe(item.bodyFatPct, 0, 100) &&
  maybeOneOf(item.proteinLevel, ["moderate", "high", "very_high"]) &&
  maybe(item.trainingDays, 0, 7) &&
  maybe(item.sessionMinutes, 0) &&
  maybeOneOf(item.trainingType, ["strength", "cardio", "mixed"]) &&
  maybeOneOf(item.experience, ["beginner", "intermediate", "advanced"]) &&
  maybe(item.knownIntake, 0) &&
  maybeOneOf(item.recentTrend, ["stable", "gaining", "losing"]) &&
  maybe(item.initialExpenditure, 0) &&
  maybeOneOf(item.mealStyle, ["named", "numbered"]) &&
  maybe(item.mealsPerDay, 1) &&
  maybeOneOf(item.dietType, ["balanced", "low_carb", "keto", "high_protein"]) &&
  maybeOneOf(item.calorieSchedule, ["even", "training", "custom"]) &&
  maybe(item.trainingDayExtra, Number.NEGATIVE_INFINITY) &&
  (absent(item.customDayOffsets) ||
    (isRecord(item.customDayOffsets) &&
      Object.values(item.customDayOffsets).every((extra) => maybe(extra, Number.NEGATIVE_INFINITY))));

const meal = (item: unknown) =>
  isMealEntry(item) &&
  isDay(item.date) &&
  [item.kcal, item.proteinG, item.carbsG, item.fatsG].every((value) => between(value, 0)) &&
  maybe(item.grams, 0) &&
  maybe(item.alcoholG, 0);

/** El primer problema que encuentra, en palabras, o null si todo sirve. */
export function backupProblem(data: Data): string | null {
  const bad = (items: unknown[], check: (item: unknown) => boolean) => !items.every(check);
  if (bad(list(data.biometrics), biometrics))
    return "hay días con fecha, peso, comida o composición que no son posibles";
  if (bad(list(data.wellbeing), wellbeing)) return "hay chequeos de bienestar con datos que no son posibles";
  if (bad(list(data.workouts), workout)) return "hay entrenos con datos inválidos";
  if (bad(list(data.habits), habit)) return "hay hábitos con datos inválidos";
  if (bad(list(data.routines), routine)) return "la rutina de entreno no es válida";
  if (bad(list(data.reviews), (item) => isWeeklyReview(item) && isDay(item.date)))
    return "el historial de revisiones no es válido";
  if (bad(list(data.sleep), (item) => isSleepEntry(item) && isDay(item.date)))
    return "hay noches de sueño con datos inválidos";
  if (bad(list(data.foods), isFood)) return "hay alimentos con datos inválidos";
  if (bad(list(data.meals), meal)) return "hay comidas con datos inválidos";
  if (!absent(data.profile) && !profile(data.profile)) return "el plan nutricional no es válido";
  return null;
}
