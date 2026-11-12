import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";

/**
 * Composición corporal a partir de lo que entrega una balanza de bioimpedancia
 * o una medición manual: % de grasa, masa muscular, % de agua y masa ósea.
 * Todo es opcional; con solo el % de grasa ya se separa grasa de masa magra.
 *
 * Estas lecturas varían mucho de un día a otro (hidratación, hora, comida), así
 * que aquí se comparan promedios suavizados y nunca dos mediciones sueltas.
 */
export type BodyComposition = {
  bodyFatPct?: number | null;
  muscleMassKg?: number | null;
  waterPct?: number | null;
  boneMassKg?: number | null;
};

export type CompositionSnapshot = {
  date: string;
  weightKg: number;
  bodyFatPct: number;
  fatMassKg: number;
  leanMassKg: number;
};

export type CompositionChange = {
  from: CompositionSnapshot;
  to: CompositionSnapshot;
  days: number;
  measurements: number;
  weightDeltaKg: number;
  fatMassDeltaKg: number;
  leanMassDeltaKg: number;
};

const SMOOTHING = 0.3;
const round1 = (value: number) => Math.round(value * 10) / 10;
const hasNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export const fatMassKg = (weightKg: number, bodyFatPct: number) => (weightKg * bodyFatPct) / 100;
export const leanMassKg = (weightKg: number, bodyFatPct: number) =>
  weightKg - fatMassKg(weightKg, bodyFatPct);

/** Índice de masa libre de grasa: masa magra relativa a la estatura (kg/m²). */
export function fatFreeMassIndex(leanKg: number, heightCm: number): number {
  const meters = heightCm / 100;
  return round1(leanKg / (meters * meters));
}

/** Rangos válidos de cada campo. Devuelve el nombre del primero que no cumple, o null. */
export function invalidCompositionField(input: BodyComposition, weightKg: number): string | null {
  const { bodyFatPct, muscleMassKg, waterPct, boneMassKg } = input;
  if (bodyFatPct != null && (bodyFatPct < 2 || bodyFatPct > 70)) return "% de grasa";
  if (muscleMassKg != null && (muscleMassKg <= 0 || muscleMassKg >= weightKg)) return "masa muscular";
  if (waterPct != null && (waterPct < 20 || waterPct > 80)) return "% de agua";
  if (boneMassKg != null && (boneMassKg <= 0 || boneMassKg > 10)) return "masa ósea";
  return null;
}

/**
 * Serie suavizada de grasa y masa magra con los días que tienen % de grasa.
 * El peso y el % se suavizan por separado y luego se combinan.
 */
export function compositionSeries(records: DailyBiometrics[]): CompositionSnapshot[] {
  const measured = [...records]
    .filter((record) => hasNumber(record.bodyFatPct) && hasNumber(record.weightKg))
    .sort((a, b) => a.date.localeCompare(b.date));
  let weight = 0;
  let fat = 0;
  return measured.map((record, index) => {
    const pct = record.bodyFatPct as number;
    const kg = record.weightKg as number;
    weight = index === 0 ? kg : weight + SMOOTHING * (kg - weight);
    fat = index === 0 ? pct : fat + SMOOTHING * (pct - fat);
    return {
      date: record.date,
      weightKg: round1(weight),
      bodyFatPct: round1(fat),
      fatMassKg: round1(fatMassKg(weight, fat)),
      leanMassKg: round1(leanMassKg(weight, fat)),
    };
  });
}

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** Cambio entre la primera y la última medición suavizada. Pide al menos 3 mediciones en 7 días o más. */
export function compositionChange(records: DailyBiometrics[]): CompositionChange | null {
  const series = compositionSeries(records);
  if (series.length < 3) return null;
  const from = series[0];
  const to = series[series.length - 1];
  const days = daysBetween(from.date, to.date);
  if (days < 7) return null;
  return {
    from,
    to,
    days,
    measurements: series.length,
    weightDeltaKg: round1(to.weightKg - from.weightKg),
    fatMassDeltaKg: round1(to.fatMassKg - from.fatMassKg),
    leanMassDeltaKg: round1(to.leanMassKg - from.leanMassKg),
  };
}

const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(1)}`;

/** Lectura en una frase de qué parte del cambio de peso fue grasa y qué parte masa magra. */
export function describeCompositionChange(change: CompositionChange, goal: "gain" | "maintain" | "lose") {
  const base = `En ${change.days} días: grasa ${signed(change.fatMassDeltaKg)} kg, masa magra ${signed(change.leanMassDeltaKg)} kg.`;
  const { fatMassDeltaKg: fat, leanMassDeltaKg: lean } = change;
  if (Math.abs(fat) < 0.3 && Math.abs(lean) < 0.3) return `${base} Sin cambios claros todavía.`;
  if (goal === "lose" && lean < -0.5 && lean < fat)
    return `${base} Estás perdiendo más masa magra que grasa: revisa la proteína y si el déficit es muy agresivo.`;
  if (goal === "lose" && fat < 0) return `${base} La mayor parte de lo perdido es grasa.`;
  if (goal === "gain" && fat > lean && fat > 0.5)
    return `${base} Estás ganando más grasa que masa magra: un superávit menor suele bastar.`;
  if (goal === "gain" && lean > 0) return `${base} La mayor parte de lo ganado es masa magra.`;
  return base;
}

/** El último valor registrado de cada medida, para mostrar "lo más reciente" aunque sea de días distintos. */
export function latestComposition(records: DailyBiometrics[]): Required<BodyComposition> {
  const ordered = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const pick = (key: keyof BodyComposition) =>
    ordered.find((record) => hasNumber(record[key]))?.[key] ?? null;
  return {
    bodyFatPct: pick("bodyFatPct"),
    muscleMassKg: pick("muscleMassKg"),
    waterPct: pick("waterPct"),
    boneMassKg: pick("boneMassKg"),
  };
}
