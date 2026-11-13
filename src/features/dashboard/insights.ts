import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { compositionSeries } from "@/src/features/composition/composition";
import { weightUnitOf, type NutritionProfile } from "@/src/features/profile/profile";
import { SLEEP_GOAL_MINUTES, sleepMinutes, sleepSummary, type SleepEntry } from "@/src/features/sleep/sleep";
import { analyzeMetabolism, expenditureSeries, trendPoints } from "@/src/features/tdee/tdee";
import { addDays, localDateKey } from "@/src/lib/dates";
import { formatDuration } from "@/src/lib/time";
import { convertWeight, formatWeight } from "@/src/lib/units";

/**
 * Las pantallas de detalle del Panel: qué series dibujar en un rango de fechas
 * y qué cifras mostrar debajo. Módulo puro; el dibujo está en DetailChart.
 */
export type InsightMetric =
  "weight" | "expenditure" | "balance" | "macros" | "composition" | "sleep" | "consistency";
export type InsightRange = "1S" | "1M" | "3M" | "6M" | "1A";
export const RANGE_DAYS: Record<InsightRange, number> = { "1S": 7, "1M": 30, "3M": 90, "6M": 180, "1A": 365 };
export const INSIGHT_TITLES: Record<InsightMetric, string> = {
  weight: "Peso y tendencia",
  expenditure: "Gasto energético",
  balance: "Balance energético",
  macros: "Calorías y macros",
  composition: "Composición corporal",
  sleep: "Sueño",
  consistency: "Constancia",
};

/** Colores por nombre: la interfaz los traduce a su paleta. */
export type SeriesColor =
  "kcal" | "protein" | "carbs" | "fats" | "violet" | "warning" | "accent" | "blue" | "muted";
export type Series = {
  label: string;
  color: SeriesColor;
  /** line: línea; dots: puntos sueltos; bars: barras desde cero; stack: barras apiladas con las demás "stack". */
  kind: "line" | "dots" | "bars" | "stack";
  values: Array<number | null>;
};
export type Insight = {
  metric: InsightMetric;
  title: string;
  unit: string;
  dates: string[];
  series: Series[];
  reference?: { value: number; label: string };
  stats: Array<{ label: string; value: string }>;
  /** Mensaje si no hay datos suficientes para el gráfico. */
  empty?: string;
};

export type InsightData = {
  records: DailyBiometrics[];
  profile: NutritionProfile;
  sleep: SleepEntry[];
  today?: string;
};

/** Cada día del rango, del más antiguo a hoy. */
export function rangeDates(range: InsightRange, today = localDateKey()): string[] {
  const days = RANGE_DAYS[range];
  return Array.from({ length: days }, (_, index) => addDays(today, index - days + 1));
}

const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;
const signed = (value: number, text: string) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${text}`;
const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const present = (values: Array<number | null>) => values.filter((value): value is number => value !== null);

function weightInsight({ records, profile, today }: InsightData, dates: string[]): Insight {
  const unit = weightUnitOf(profile);
  const byDate = new Map(records.map((record) => [record.date, record]));
  const trend = new Map(trendPoints(records).map((point) => [point.date, point.trendKg]));
  const scale = (kg: number | null | undefined) => (kg ? round(convertWeight(kg, "kg", unit), 2) : null);
  const weights = dates.map((date) => scale(byDate.get(date)?.weightKg));
  const trends = dates.map((date) => scale(trend.get(date)));
  const shown = present(trends);
  const analysis = analyzeMetabolism(records.filter((record) => record.date <= (today ?? localDateKey())));
  const stats: Insight["stats"] = [];
  if (shown.length) {
    const last = shown.at(-1) as number;
    stats.push({ label: "Tendencia actual", value: `${round(last)} ${unit}` });
    stats.push({
      label: "Cambio en el rango",
      value: `${signed(last - shown[0], String(Math.abs(round(last - shown[0]))))} ${unit}`,
    });
  }
  if (analysis.weeklyRateKg !== null)
    stats.push({
      label: "Ritmo semanal",
      value: `${signed(analysis.weeklyRateKg, formatWeight(Math.abs(analysis.weeklyRateKg), unit, 2))}`,
    });
  const lastKg = trendPoints(records).at(-1)?.trendKg;
  if (profile.goalWeightKg && lastKg && analysis.weeklyRateKg) {
    const remaining = profile.goalWeightKg - lastKg;
    // Solo se proyecta si la tendencia va hacia la meta.
    if (Math.sign(remaining) === Math.sign(analysis.weeklyRateKg) && Math.abs(remaining) > 0.1) {
      const weeks = Math.abs(remaining / analysis.weeklyRateKg);
      stats.push({
        label: "Llegada estimada a la meta",
        value: addDays(today ?? localDateKey(), Math.round(weeks * 7)),
      });
    }
  }
  return {
    metric: "weight",
    title: INSIGHT_TITLES.weight,
    unit,
    dates,
    series: [
      { label: "Pesaje", color: "muted", kind: "dots", values: weights },
      { label: "Tendencia", color: "violet", kind: "line", values: trends },
    ],
    ...(profile.goalWeightKg
      ? { reference: { value: scale(profile.goalWeightKg) as number, label: "Meta" } }
      : {}),
    stats,
    ...(present(weights).length < 2 ? { empty: "Pésate al menos dos días para ver la tendencia." } : {}),
  };
}

function expenditureInsight({ records }: InsightData, dates: string[]): Insight {
  const series = new Map(expenditureSeries(records, dates.length).map((point) => [point.date, point.tdee]));
  const values = dates.map((date) => series.get(date) ?? null);
  const shown = present(values);
  const analysis = analyzeMetabolism(records);
  return {
    metric: "expenditure",
    title: INSIGHT_TITLES.expenditure,
    unit: "kcal",
    dates,
    series: [{ label: "Gasto estimado", color: "warning", kind: "line", values }],
    stats: shown.length
      ? [
          { label: "Gasto actual", value: `${shown.at(-1)} kcal` },
          { label: "Margen aproximado", value: `± ${analysis.tdeeMargin ?? "—"} kcal` },
          { label: "Promedio del rango", value: `${Math.round(mean(shown))} kcal` },
          { label: "Energía por kg usada", value: `${analysis.energyPerKg} kcal` },
        ]
      : [],
    ...(shown.length < 2
      ? {
          empty: `Se calcula con 14 días de pesajes y 10 de comida. Llevas ${analysis.loggedDays} de comida.`,
        }
      : {}),
  };
}

function balanceInsight({ records }: InsightData, dates: string[]): Insight {
  const tdee = analyzeMetabolism(records).tdee;
  const byDate = new Map(records.map((record) => [record.date, record]));
  const values = dates.map((date) => {
    const record = byDate.get(date);
    return tdee && record && record.caloriesIn > 0 && !record.partial ? record.caloriesIn - tdee : null;
  });
  const shown = present(values);
  return {
    metric: "balance",
    title: INSIGHT_TITLES.balance,
    unit: "kcal",
    dates,
    series: [{ label: "Comido − gasto", color: "blue", kind: "bars", values }],
    reference: { value: 0, label: "Gasto" },
    stats: shown.length
      ? [
          {
            label: "Promedio diario",
            value: `${signed(mean(shown), String(Math.abs(Math.round(mean(shown)))))} kcal`,
          },
          {
            label: "Total del rango",
            value: `${signed(
              shown.reduce((a, b) => a + b, 0),
              String(Math.abs(Math.round(shown.reduce((a, b) => a + b, 0)))),
            )} kcal`,
          },
          {
            label: "Días en déficit",
            value: `${shown.filter((value) => value < 0).length} de ${shown.length}`,
          },
          {
            label: "Equivale a",
            value: `${signed(
              shown.reduce((a, b) => a + b, 0),
              String(Math.abs(round(shown.reduce((a, b) => a + b, 0) / 7700, 2))),
            )} kg`,
          },
        ]
      : [],
    ...(!tdee ? { empty: "Necesita tu gasto estimado: 14 días de pesajes y 10 de comida." } : {}),
  };
}

function macrosInsight({ records, profile }: InsightData, dates: string[]): Insight {
  const byDate = new Map(records.map((record) => [record.date, record]));
  const pick = (field: "proteinG" | "carbsG" | "fatsG", factor: number) =>
    dates.map((date) => {
      const record = byDate.get(date);
      return record && record.caloriesIn > 0 ? Math.round(record[field] * factor) : null;
    });
  const logged = dates.flatMap((date) => {
    const record = byDate.get(date);
    return record && record.caloriesIn > 0 ? [record] : [];
  });
  const avg = (field: "caloriesIn" | "proteinG" | "carbsG" | "fatsG") =>
    Math.round(mean(logged.map((record) => record[field])));
  return {
    metric: "macros",
    title: INSIGHT_TITLES.macros,
    unit: "kcal",
    dates,
    series: [
      { label: "Proteína", color: "protein", kind: "stack", values: pick("proteinG", 4) },
      { label: "Carbohidratos", color: "carbs", kind: "stack", values: pick("carbsG", 4) },
      { label: "Grasas", color: "fats", kind: "stack", values: pick("fatsG", 9) },
    ],
    reference: { value: profile.calorieTarget, label: "Meta" },
    stats: logged.length
      ? [
          { label: "Calorías promedio", value: `${avg("caloriesIn")} de ${profile.calorieTarget}` },
          { label: "Proteína promedio", value: `${avg("proteinG")} de ${profile.proteinTarget} g` },
          { label: "Carbohidratos promedio", value: `${avg("carbsG")} de ${profile.carbsTarget} g` },
          { label: "Grasas promedio", value: `${avg("fatsG")} de ${profile.fatsTarget} g` },
        ]
      : [],
    ...(!logged.length ? { empty: "Registra comidas para ver tus macros." } : {}),
  };
}

function compositionInsight({ records, profile }: InsightData, dates: string[]): Insight {
  const unit = weightUnitOf(profile);
  const series = new Map(compositionSeries(records).map((point) => [point.date, point]));
  const scale = (kg: number | undefined) =>
    kg === undefined ? null : round(convertWeight(kg, "kg", unit), 1);
  const fat = dates.map((date) => scale(series.get(date)?.fatMassKg));
  const lean = dates.map((date) => scale(series.get(date)?.leanMassKg));
  const points = dates.flatMap((date) => (series.has(date) ? [series.get(date)!] : []));
  const first = points[0];
  const last = points.at(-1);
  return {
    metric: "composition",
    title: INSIGHT_TITLES.composition,
    unit,
    dates,
    series: [
      { label: "Masa magra", color: "accent", kind: "line", values: lean },
      { label: "Grasa", color: "fats", kind: "line", values: fat },
    ],
    stats:
      first && last
        ? [
            { label: "Grasa corporal", value: `${last.bodyFatPct} %` },
            { label: "Masa magra", value: `${round(convertWeight(last.leanMassKg, "kg", unit))} ${unit}` },
            {
              label: "Cambio de grasa",
              value: `${signed(last.fatMassKg - first.fatMassKg, String(Math.abs(round(convertWeight(last.fatMassKg - first.fatMassKg, "kg", unit)))))} ${unit}`,
            },
            {
              label: "Cambio de masa magra",
              value: `${signed(last.leanMassKg - first.leanMassKg, String(Math.abs(round(convertWeight(last.leanMassKg - first.leanMassKg, "kg", unit)))))} ${unit}`,
            },
          ]
        : [],
    ...(points.length < 2
      ? { empty: "Registra tu % de grasa al menos dos días para ver la evolución." }
      : {}),
  };
}

function sleepInsight({ sleep }: InsightData, dates: string[]): Insight {
  const byDate = new Map(sleep.map((entry) => [entry.date, entry]));
  const values = dates.map((date) => {
    const entry = byDate.get(date);
    const minutes = entry ? sleepMinutes(entry.bedtime, entry.wakeTime) : null;
    return minutes === null ? null : round(minutes / 60, 1);
  });
  const summary = sleepSummary(
    sleep.filter((entry) => entry.date >= dates[0]),
    dates.length,
  );
  return {
    metric: "sleep",
    title: INSIGHT_TITLES.sleep,
    unit: "h",
    dates,
    series: [{ label: "Horas dormidas", color: "violet", kind: "bars", values }],
    reference: { value: SLEEP_GOAL_MINUTES / 60, label: "8 h" },
    stats: summary.averageMinutes
      ? [
          { label: "Promedio por noche", value: formatDuration(summary.averageMinutes) },
          { label: "Hora media de acostarse", value: summary.averageBedtime ?? "—" },
          {
            label: "Regularidad",
            value: summary.bedtimeSpreadMinutes === null ? "—" : `± ${summary.bedtimeSpreadMinutes} min`,
          },
          {
            label: "Calidad promedio",
            value: summary.averageQuality ? `${summary.averageQuality} de 5` : "—",
          },
        ]
      : [],
    ...(!present(values).length ? { empty: "Registra tu sueño en el Diario para verlo aquí." } : {}),
  };
}

/** Nivel de registro de un día: 0 nada, 1 algo, 2 comida o peso, 3 comida y peso. */
export function loggingLevel(record: DailyBiometrics | undefined, slept: boolean): number {
  const food = (record?.caloriesIn ?? 0) > 0;
  const weight = (record?.weightKg ?? 0) > 0;
  if (food && weight) return 3;
  if (food || weight) return 2;
  return slept ? 1 : 0;
}

function consistencyInsight({ records, sleep }: InsightData, dates: string[]): Insight {
  const byDate = new Map(records.map((record) => [record.date, record]));
  const slept = new Set(sleep.map((entry) => entry.date));
  const levels = dates.map((date) => loggingLevel(byDate.get(date), slept.has(date)));
  let streak = 0;
  for (let index = levels.length - 1; index >= 0 && levels[index] >= 2; index -= 1) streak += 1;
  const food = dates.filter((date) => (byDate.get(date)?.caloriesIn ?? 0) > 0).length;
  const weighed = dates.filter((date) => (byDate.get(date)?.weightKg ?? 0) > 0).length;
  return {
    metric: "consistency",
    title: INSIGHT_TITLES.consistency,
    unit: "",
    dates,
    series: [{ label: "Registro", color: "accent", kind: "bars", values: levels }],
    stats: [
      { label: "Días con comida", value: `${food} de ${dates.length}` },
      { label: "Días con pesaje", value: `${weighed} de ${dates.length}` },
      { label: "Racha actual", value: `${streak} días` },
    ],
  };
}

export function buildInsight(metric: InsightMetric, range: InsightRange, data: InsightData): Insight {
  const dates = rangeDates(range, data.today);
  const builders: Record<InsightMetric, (data: InsightData, dates: string[]) => Insight> = {
    weight: weightInsight,
    expenditure: expenditureInsight,
    balance: balanceInsight,
    macros: macrosInsight,
    composition: compositionInsight,
    sleep: sleepInsight,
    consistency: consistencyInsight,
  };
  return builders[metric](data, dates);
}

export const isInsightMetric = (value: unknown): value is InsightMetric =>
  typeof value === "string" && value in INSIGHT_TITLES;
