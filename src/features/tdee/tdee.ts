import { countsForIntake } from "@/src/features/biometrics/dailyLog";
import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { convertWeight, type WeightUnit } from "@/src/lib/units";
import { checkInDaysOf, goalCalorieOffset, type NutritionProfile } from "@/src/features/profile/profile";
import type { Period } from "@/src/features/period/period";
import { LOGGING_BIAS, adaptiveEngine, type Adaptive } from "@/src/features/tdee/adaptive";

export type TrendPoint = {
  date: string;
  weightKg: number;
  trendKg: number;
  caloriesIn: number;
  /** El pesaje parecía agua o un salto puntual y pesó menos en la tendencia. */
  damped?: boolean;
};
export type ExpenditureStatus = "building" | "updating" | "holding";
export type TdeeRange = { low: number; high: number; kcalPerKg: { low: number; high: number } };
export type MetabolicAnalysis = {
  points: TrendPoint[];
  tdee: number | null;
  /** Margen aproximado del gasto (±), según lo estable que es la tendencia. */
  tdeeMargin: number | null;
  /** El gasto en otros escenarios de energía por kilo: sensibilidad, no probabilidad ni límites. */
  tdeeRange: TdeeRange | null;
  weeklyRateKg: number | null;
  /** kcal por kg de cambio de peso: 7700 por defecto, ajustado con la composición si se mide. */
  energyPerKg: number;
  loggedDays: number;
  /** Ingesta media del mismo periodo que los pesajes; null sin datos suficientes. */
  averageIntake: number | null;
  /** Días marcados como incompletos: no cuentan para la ingesta media. */
  partialDays: number;
  nutritionDaysLast7: number;
  weightDaysLast7: number;
  status: ExpenditureStatus;
  /** Motor de autoajuste: su avance hacia los 15 días o, ya activo, todo lo que estima. */
  adaptive?: Adaptive;
};
/** El cálculo simple, con lo que el motor necesita para repetirse en otro escenario. */
export type SimpleAnalysis = MetabolicAnalysis & {
  scenarios: number[];
  tdeeAt: ((density: number) => number) | null;
};
export type AnalysisOptions = {
  /** `false` si no se va a mostrar el rango: con el motor activo se corre otra vez por escenario. */
  range?: boolean;
  periods?: Period[];
  /** Registros de más días para el motor de autoajuste (por defecto, los mismos). */
  history?: DailyBiometrics[];
  estimated?: Record<string, number>;
  transitions?: string[];
  /** Día desde el que se mira (hoy). Sin él, el del último registro. */
  asOf?: string;
  /** Inicio del plan: en sus primeras semanas se suma un escenario más bajo (agua y glucógeno). */
  planStart?: string;
};
export type WeeklyCheckIn = {
  status: ExpenditureStatus;
  message: string;
  suggestedCalories: number | null;
  delta: number | null;
  ready: boolean;
};

const DAY_MS = 86_400_000;
const dayIndex = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
const dayDifference = (from: string, to: string) => Math.max(1, dayIndex(to) - dayIndex(from));

// Suavizado de la tendencia: cuánto se mueve hacia cada pesaje nuevo.
const ALPHA = 0.28;
const ALPHA_DAMPED = 0.1;
// Energía de cada kg según qué tejido cambia (grasa casi pura frente a masa magra con agua).
const KCAL_PER_KG_FAT = 9400;
const KCAL_PER_KG_LEAN = 1800;
export const KCAL_PER_KG_DEFAULT = 7700;

/**
 * Escenarios de energía por kilo para el análisis de sensibilidad. Son referencias, no límites de lo que le
 * puede pasar a una persona: 5900 es un caso modelado (Hall 2008, 15 kg menos con 20 kg de grasa) y 9400 la
 * grasa sola. `early`, para el inicio de un plan, es el promedio de 23 personas en la semana 4 de dieta
 * (Heymsfield 2012: 4858 ± 388); tampoco es un mínimo.
 */
export const KCAL_PER_KG_SCENARIOS = { low: 5900, high: KCAL_PER_KG_FAT, early: 4850 };
/**
 * Cuánto se mantiene el escenario temprano: una extrapolación prudente del valor de la semana 4. En ese
 * estudio la semana 6 ya daba más (6041 ± 376), así que no representa toda la fase inicial.
 */
const EARLY_DAYS = 42;

/** Proporción de grasa que corresponde a 7700 kcal/kg, y cuánto puede variar entre personas. */
const PRIOR_FAT_SHARE = (KCAL_PER_KG_DEFAULT - KCAL_PER_KG_LEAN) / (KCAL_PER_KG_FAT - KCAL_PER_KG_LEAN);
const PRIOR_FAT_SHARE_SD = 0.25;
/** Error mínimo de una lectura de % de grasa (en proporción del peso): nunca se toma como exacta. */
const BODY_FAT_NOISE = 0.005;

/**
 * Energía por kg de cambio de peso según lo medido. Qué parte del cambio fue grasa sale de dos rectas
 * (grasa y peso en el tiempo) con su error, y se combina con el valor habitual: cuanto más ruido traen
 * las lecturas, más manda 7700 kcal/kg. Si lo medido no es posible (baja el peso y sube la grasa más
 * allá del error), la báscula no es fiable y se usa 7700.
 */
export function energyPerKg(records: DailyBiometrics[]): number {
  const measured = records
    .flatMap((record) =>
      (record.weightKg ?? 0) > 0 && (record.bodyFatPct ?? 0) > 0
        ? [{ day: dayIndex(record.date), kg: record.weightKg as number, pct: record.bodyFatPct as number }]
        : [],
    )
    .sort((a, b) => a.day - b.day);
  const span = measured.length ? measured[measured.length - 1].day - measured[0].day : 0;
  if (measured.length < 3 || span < 7) return KCAL_PER_KG_DEFAULT;
  const xs = measured.map((item) => item.day - measured[0].day);
  const weight = linearTrend(
    xs,
    measured.map((item) => item.kg),
  ).slope;
  if (Math.abs(weight * span) < 0.5) return KCAL_PER_KG_DEFAULT;
  const fatKg = measured.map((item) => (item.kg * item.pct) / 100);
  const share = linearTrend(xs, fatKg).slope / weight;
  // Error de la proporción: lo que la grasa se aparta de `share` veces el peso.
  const rest = linearTrend(
    xs,
    fatKg.map((fat, index) => fat - share * measured[index].kg),
  );
  const meanX = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const sxx = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  const floor = (BODY_FAT_NOISE * measured[0].kg) / Math.sqrt(sxx);
  const error = Math.max(rest.standardError, floor) / Math.abs(weight);
  if (share < -1.96 * error || share > 1 + 1.96 * error) return KCAL_PER_KG_DEFAULT;
  const trust = PRIOR_FAT_SHARE_SD ** 2 / (PRIOR_FAT_SHARE_SD ** 2 + error ** 2);
  const fatShare = Math.max(0, Math.min(1, PRIOR_FAT_SHARE + trust * (share - PRIOR_FAT_SHARE)));
  return Math.round(fatShare * KCAL_PER_KG_FAT + (1 - fatShare) * KCAL_PER_KG_LEAN);
}

/**
 * Los escenarios que se comparan, de menor a mayor, con el valor usado entre ellos. La composición medida no
 * los estrecha: una báscula doméstica puede errar siempre igual, y eso no se ve en sus lecturas.
 */
const scenariosFor = (used: number, early: boolean) =>
  [
    ...new Set([
      ...(early ? [KCAL_PER_KG_SCENARIOS.early] : []),
      KCAL_PER_KG_SCENARIOS.low,
      KCAL_PER_KG_DEFAULT,
      used,
      KCAL_PER_KG_SCENARIOS.high,
    ]),
  ].sort((a, b) => a - b);

/** El gasto y su margen, calculados en cada escenario: el rango va del más bajo al más alto de todos. */
function envelope(
  scenarios: number[],
  estimate: (density: number) => { tdee: number; margin: number } | null,
): TdeeRange {
  const each = scenarios.flatMap((density) => estimate(density) ?? []);
  return {
    low: Math.floor(Math.min(...each.map((end) => end.tdee - end.margin)) / 10) * 10,
    high: Math.ceil(Math.max(...each.map((end) => end.tdee + end.margin)) / 10) * 10,
    kcalPerKg: { low: scenarios[0], high: scenarios[scenarios.length - 1] },
  };
}

/** Cuánto ensanchar un error si los desvíos de días seguidos se parecen. Con pocos datos se suma 1/n. */
function wideningOf(xs: number[], residuals: number[]): number {
  const power = residuals.reduce((sum, r) => sum + r * r, 0);
  const paired = residuals.reduce(
    (sum, r, i) => (i && xs[i] - xs[i - 1] <= 2 ? sum + r * residuals[i - 1] : sum),
    0,
  );
  const correlation = power > 1e-12 ? Math.max(0, Math.min(0.8, paired / power + 1 / residuals.length)) : 0;
  return Math.sqrt((1 + correlation) / (1 - correlation));
}

/** Pendiente de una recta ajustada por mínimos cuadrados y su error estándar. */
export function linearTrend(xs: number[], ys: number[]): { slope: number; standardError: number } {
  const n = xs.length;
  const meanX = xs.reduce((sum, x) => sum + x, 0) / n;
  const meanY = ys.reduce((sum, y) => sum + y, 0) / n;
  const sxx = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  if (n < 3 || sxx === 0) return { slope: 0, standardError: 0 };
  const slope = xs.reduce((sum, x, index) => sum + (x - meanX) * (ys[index] - meanY), 0) / sxx;
  const intercept = meanY - slope * meanX;
  const residuals = xs.reduce((sum, x, index) => sum + (ys[index] - (intercept + slope * x)) ** 2, 0);
  return { slope, standardError: Math.sqrt(residuals / (n - 2) / sxx) };
}

/**
 * Ritmo del peso: recta ajustada a los pesajes, con su error. Un pesaje que parece agua pesa menos.
 * Se ajusta a los pesajes y no a la tendencia suavizada: los puntos suavizados se parecen entre sí y el
 * error salía varias veces menor que el real. Si los desvíos de días seguidos se parecen (agua que dura),
 * el error se ensancha.
 */
export function weightSlope(points: TrendPoint[]): { slope: number; standardError: number } {
  const n = points.length;
  if (n < 3) return { slope: 0, standardError: 0 };
  const first = dayIndex(points[0].date);
  const xs = points.map((point) => dayIndex(point.date) - first);
  const ws = points.map((point) => (point.damped ? ALPHA_DAMPED / ALPHA : 1));
  const total = ws.reduce((sum, w) => sum + w, 0);
  const meanX = xs.reduce((sum, x, i) => sum + ws[i] * x, 0) / total;
  const meanY = points.reduce((sum, point, i) => sum + ws[i] * point.weightKg, 0) / total;
  const sxx = xs.reduce((sum, x, i) => sum + ws[i] * (x - meanX) ** 2, 0);
  if (sxx === 0) return { slope: 0, standardError: 0 };
  const slope = xs.reduce((sum, x, i) => sum + ws[i] * (x - meanX) * (points[i].weightKg - meanY), 0) / sxx;
  const residuals = points.map((point, i) => point.weightKg - (meanY + slope * (xs[i] - meanX)));
  const variance = residuals.reduce((sum, r, i) => sum + ws[i] * r * r, 0) / (n - 2);
  return { slope, standardError: Math.sqrt(variance / sxx) * wideningOf(xs, residuals) };
}

/** Desviaciones que abarcan el 95 % con `n` datos (t de Student, aproximada). */
export const spread95 = (n: number) => 1.96 + 2.5 / Math.max(1, n - 2);

/**
 * Tendencia de peso suavizada. Un pesaje que se aparta más de 1.5 % de la
 * tendencia, o que llega con el % de agua 1.5 puntos fuera de lo habitual,
 * probablemente es agua (sal, carbohidratos, entrenamiento) y pesa menos.
 */
export function trendPoints(records: DailyBiometrics[]): TrendPoint[] {
  const weighed = [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((record) =>
      typeof record.weightKg === "number" && record.weightKg > 0
        ? [{ ...record, weightKg: record.weightKg }]
        : [],
    );
  let trend = 0;
  let water: number | null = null;
  return weighed.map((record, index) => {
    const waterJump =
      water !== null && typeof record.waterPct === "number" && record.waterPct > 0
        ? Math.abs(record.waterPct - water) >= 1.5
        : false;
    const weightJump = index > 0 && Math.abs(record.weightKg - trend) / trend > 0.015;
    const damped = index > 0 && (waterJump || weightJump);
    // Pesarse a diario mueve la tendencia 0.28; tras varios días sin pesarse, lo equivalente a esos días.
    const gap = index === 0 ? 1 : dayDifference(weighed[index - 1].date, record.date);
    const alpha = 1 - (1 - (damped ? ALPHA_DAMPED : ALPHA)) ** gap;
    trend = index === 0 ? record.weightKg : trend + alpha * (record.weightKg - trend);
    if (typeof record.waterPct === "number" && record.waterPct > 0)
      water = water === null ? record.waterPct : water + 0.3 * (record.waterPct - water);
    return {
      date: record.date,
      weightKg: record.weightKg,
      trendKg: trend,
      caloriesIn: record.caloriesIn,
      ...(damped ? { damped: true } : {}),
    };
  });
}

/**
 * El análisis que usa toda la app. Parte del cálculo simple y, cuando ya hay 15
 * días seguidos completos, el gasto, su margen y el ritmo pasan a salir del
 * motor de autoajuste (`adaptive.ts`).
 */
export function analyzeMetabolism(
  records: DailyBiometrics[],
  options: AnalysisOptions = {},
): MetabolicAnalysis {
  const { scenarios, tdeeAt, ...simple } = simpleAnalysis(records, options.asOf, options.planStart);
  const engineAt = (density: number, drift?: number) =>
    adaptiveEngine(options.history ?? records, {
      energyPerKg: density,
      priorTdee: tdeeAt?.(density) ?? null,
      periods: options.periods,
      estimated: options.estimated,
      transitions: options.transitions,
      drift,
    });
  const adaptive = engineAt(simple.energyPerKg);
  if (!adaptive.active) return { ...simple, adaptive };
  // El motor se vuelve a correr en cada escenario, con sus mismos datos y la deriva que ya eligió.
  return {
    ...simple,
    tdee: Math.round(adaptive.tdee),
    tdeeMargin: adaptive.margin,
    tdeeRange:
      options.range === false
        ? null
        : envelope(scenarios, (density) => {
            const run = density === simple.energyPerKg ? adaptive : engineAt(density, adaptive.driftKcal);
            return run.active ? { tdee: run.tdee, margin: 1.96 * run.totalSd } : null;
          }),
    weeklyRateKg: adaptive.weeklyRateKg,
    adaptive,
  };
}

/** Días que mira el cálculo simple. */
const SIMPLE_WINDOW_DAYS = 42;

/**
 * El cálculo simple: ingesta media menos lo que cambió el peso. Las dos cosas se miden en el mismo
 * periodo, del primer al último pesaje: lo comido el día del último pesaje aún no está en la báscula.
 */
export function simpleAnalysis(
  records: DailyBiometrics[],
  asOf?: string,
  planStart?: string,
): SimpleAnalysis {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const lastDay = sorted.length ? dayIndex(sorted[sorted.length - 1].date) : 0;
  const ordered = sorted.filter((record) => dayIndex(record.date) > lastDay - SIMPLE_WINDOW_DAYS);
  const points = trendPoints(ordered);
  const partialDays = ordered.filter((record) => record.partial).length;
  // Los últimos siete días del calendario, no los últimos siete registros.
  const today = asOf ? dayIndex(asOf) : lastDay;
  const lastSeven = ordered.filter((record) => {
    const day = dayIndex(record.date);
    return day > today - 7 && day <= today;
  });
  const nutritionDaysLast7 = lastSeven.filter(countsForIntake).length;
  const weightDaysLast7 = lastSeven.filter((record) => (record.weightKg ?? 0) > 0).length;
  const from = points[0]?.date ?? "";
  const to = points.at(-1)?.date ?? "";
  const spanDays = points.length > 1 ? dayDifference(from, to) : 0;
  // Un día marcado como incompleto no representa lo que se comió: no cuenta para la media.
  const logged = ordered.filter(countsForIntake);
  // Solo lo comido entre el primer y el último pesaje explica el cambio de peso; con un solo pesaje o
  // ninguno todavía no hay periodo.
  const intakeDays = points.length > 1 ? logged.filter((day) => day.date >= from && day.date < to) : logged;
  const density = energyPerKg(ordered);
  // Un plan que empieza más adelante todavía no está en sus primeras semanas.
  const elapsed = planStart === undefined ? -1 : today - dayIndex(planStart);
  const early = elapsed >= 0 && elapsed < EARLY_DAYS;
  const base = {
    scenarios: scenariosFor(density, early),
    tdeeAt: null,
    tdeeRange: null,
    points,
    energyPerKg: density,
    loggedDays: intakeDays.length,
    averageIntake: null,
    partialDays,
    nutritionDaysLast7,
    weightDaysLast7,
  };
  if (points.length < 14 || intakeDays.length < 10 || spanDays < 13)
    return { ...base, tdee: null, tdeeMargin: null, weeklyRateKg: null, status: "building" };
  const { slope, standardError } = weightSlope(points);
  const averageIntake =
    intakeDays.reduce((total, record) => total + record.caloriesIn, 0) / intakeDays.length;
  const status: ExpenditureStatus = nutritionDaysLast7 >= 4 && weightDaysLast7 >= 1 ? "updating" : "holding";
  // Margen del 95 %: la pendiente, los días del periodo sin anotar y un 3 % por errores al registrar.
  const intakeVariance =
    intakeDays.reduce((sum, day) => sum + (day.caloriesIn - averageIntake) ** 2, 0) /
    Math.max(1, intakeDays.length - 1);
  const missing = Math.max(0, 1 - intakeDays.length / spanDays);
  const tdeeAt = (kcalPerKg: number) => averageIntake - slope * kcalPerKg;
  const marginAt = (kcalPerKg: number) =>
    Math.sqrt(
      (spread95(points.length) * standardError * kcalPerKg) ** 2 +
        1.96 ** 2 * ((intakeVariance / intakeDays.length) * missing + (LOGGING_BIAS * averageIntake) ** 2),
    );
  return {
    ...base,
    averageIntake,
    tdee: Math.round(tdeeAt(density)),
    tdeeMargin: Math.round(marginAt(density) / 10) * 10,
    tdeeAt,
    tdeeRange: envelope(base.scenarios, (kcalPerKg) => ({
      tdee: tdeeAt(kcalPerKg),
      margin: marginAt(kcalPerKg),
    })),
    weeklyRateKg: slope * 7,
    status,
  };
}

export function weeklyRecommendation(
  analysis: MetabolicAnalysis,
  goal: "gain" | "maintain" | "lose",
  currentWeightKg: number,
  unit: WeightUnit = "kg",
) {
  if (!analysis.tdee || analysis.weeklyRateKg === null)
    return "Registra al menos 14 días, con 10 días de ingesta, antes de ajustar el plan.";
  const desiredRate =
    goal === "gain" ? currentWeightKg * 0.0025 : goal === "lose" ? -currentWeightKg * 0.005 : 0;
  const difference = analysis.weeklyRateKg - desiredRate;
  if (Math.abs(difference) < 0.06)
    return "La tendencia coincide con tu objetivo. Mantén el plan una semana más.";
  const direction =
    (goal === "gain" && difference < 0) ||
    (goal === "lose" && difference > 0) ||
    (goal === "maintain" && analysis.weeklyRateKg < -0.06)
      ? "subir"
      : "bajar";
  return `La tendencia cambia ${analysis.weeklyRateKg >= 0 ? "+" : ""}${convertWeight(analysis.weeklyRateKg, "kg", unit).toFixed(2)} ${unit}/semana. Prueba ${direction} 100 kcal diarias y revisa en 7 días.`;
}

/** El gasto estimado al cierre de cada uno de los últimos `days` días con datos suficientes. */
export function expenditureSeries(
  records: DailyBiometrics[],
  days = 14,
  options: AnalysisOptions & { analysis?: MetabolicAnalysis } = {},
): Array<{ date: string; tdee: number }> {
  const ordered = [...records].sort((a, b) => a.date.localeCompare(b.date));
  // Desde que el motor se activó, cada día tiene su propia estimación; antes, el cálculo simple.
  const engine = (options.analysis ?? analyzeMetabolism(ordered, options)).adaptive;
  const byEngine = new Map(engine?.active ? engine.series.map((point) => [point.date, point.tdee]) : []);
  return ordered.slice(-days).flatMap((record) => {
    const tdee =
      byEngine.get(record.date) ?? simpleAnalysis(ordered.filter((item) => item.date <= record.date)).tdee;
    return tdee === null ? [] : [{ date: record.date, tdee }];
  });
}

/** Lo comido menos el gasto estimado en los últimos días con ingesta. Negativo = déficit. */
export function energyBalance(
  records: DailyBiometrics[],
  tdee: number | null,
  days = 7,
): Array<{ date: string; intake: number; balance: number }> {
  if (!tdee) return [];
  return [...records]
    .filter(countsForIntake)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days)
    .map((record) => ({ date: record.date, intake: record.caloriesIn, balance: record.caloriesIn - tdee }));
}

/** El rango de sensibilidad en palabras, para todas las pantallas. */
export const rangeText = ({ low, high, kcalPerKg }: TdeeRange) =>
  `Con otros supuestos de energía por kilo (de ${kcalPerKg.low} a ${kcalPerKg.high} kcal/kg) tu gasto saldría entre ${low} y ${high} kcal. Son escenarios de referencia, no límites ni una probabilidad.`;
