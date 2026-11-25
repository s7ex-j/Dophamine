import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { countsForIntake } from "@/src/features/biometrics/dailyLog";
import { analyzeMetabolism, type AnalysisOptions } from "@/src/features/tdee/tdee";
import { forecastWeight } from "@/src/features/tdee/adaptive";
import { addDays } from "@/src/lib/dates";

/**
 * Cuánto acierta el motor: se vuelve a cada fecha pasada, se le dan solo los datos que había ese día y se
 * compara el peso que esperaba 14 días después con el que marcó la báscula.
 *
 * - Usa lo que de verdad se comió en esos 14 días: mide al motor, no si se siguió el plan.
 * - Compara con el promedio de los últimos pesajes de esos días, para que el agua de uno solo no decida.
 * - Al lado va lo que se habría equivocado suponer que el peso no cambia: acertar solo vale si es mejor que eso.
 * - No sirve para elegir la energía por kilo: comiendo parejo, un valor equivocado se compensa con un gasto
 *   equivocado y el peso que se espera es casi el mismo.
 *
 * No se guarda nada: se recalcula de los registros. Módulo puro.
 */
export const HORIZON_DAYS = 14;
/** Con menos comparaciones que esto se muestran, pero no se juzga. */
export const ENOUGH_CHECKS = 3;
const MAX_CHECKS = 6;
/** Últimos días del periodo cuyos pesajes se promedian, y cuántos hacen falta. */
const TARGET_DAYS = 3;
const MIN_WEIGHINS = 2;
const MIN_INTAKE_DAYS = 11;
/** Cuánto se puede adelantar el punto de partida para encontrar un día con peso y comida. */
const MAX_SHIFT = 3;

export type ForecastCheck = {
  from: string;
  to: string;
  predictedKg: number;
  actualKg: number;
  /** Positivo: pesó más de lo esperado. */
  errorKg: number;
  /** Margen del 95 % de la predicción, con el ruido de la báscula. */
  marginKg: number;
  inside: boolean;
  /** El error de suponer que el peso no cambia. */
  stillErrorKg: number;
};
export type ForecastAccuracy = {
  checks: ForecastCheck[];
  meanErrorKg: number;
  stillMeanErrorKg: number;
  /** Media con signo: si el motor se equivoca siempre hacia el mismo lado. */
  biasKg: number;
  inside: number;
};

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

function checkFrom(
  from: string,
  records: DailyBiometrics[],
  byDate: Map<string, DailyBiometrics>,
  options: AnalysisOptions,
): ForecastCheck | null {
  const day = (offset: number) => byDate.get(addDays(from, offset));
  const start = day(0);
  if (!start || !((start.weightKg ?? 0) > 0) || !countsForIntake(start)) return null;
  // Lo que se come el día `from` aún no está en la báscula de ese día: cuenta para los 14 siguientes.
  const eaten = Array.from({ length: HORIZON_DAYS }, (_, offset) => {
    const record = day(offset);
    return record && countsForIntake(record) ? record.caloriesIn : null;
  });
  const known = eaten.filter((value): value is number => value !== null);
  const weighed = Array.from({ length: TARGET_DAYS }, (_, index) => HORIZON_DAYS - index).flatMap(
    (offset) => {
      const kg = day(offset)?.weightKg ?? 0;
      return kg > 0 ? [{ offset, kg }] : [];
    },
  );
  if (known.length < MIN_INTAKE_DAYS || weighed.length < MIN_WEIGHINS) return null;

  const past = records.filter((record) => record.date <= from);
  const { adaptive: engine } = analyzeMetabolism(past, {
    ...options,
    history: past,
    asOf: from,
    range: false,
  });
  if (!engine?.active) return null;
  const average = mean(known);
  const { energyPerKg, d } = engine.model;
  const expected = (offset: number) =>
    engine.weightKg +
    eaten.slice(0, offset).reduce<number>((sum, value) => sum + (value ?? average) / energyPerKg - d, 0);
  const predictedKg = mean(weighed.map((item) => expected(item.offset)));
  const actualKg = mean(weighed.map((item) => item.kg));
  const { sd } = forecastWeight(engine, average, HORIZON_DAYS);
  const marginKg = 1.96 * Math.sqrt(sd ** 2 + engine.noiseKg ** 2 / weighed.length);
  const errorKg = actualKg - predictedKg;
  return {
    from,
    to: addDays(from, HORIZON_DAYS),
    predictedKg,
    actualKg,
    errorKg,
    marginKg,
    inside: Math.abs(errorKg) <= marginKg,
    stillErrorKg: actualKg - engine.weightKg,
  };
}

/** Las comparaciones posibles, de la más reciente a la más antigua y sin repetir días; null si aún no hay. */
export function forecastAccuracy(
  records: DailyBiometrics[],
  options: AnalysisOptions = {},
): ForecastAccuracy | null {
  const ordered = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const first = ordered[0]?.date;
  const lastWeighIn = ordered.filter((record) => (record.weightKg ?? 0) > 0).at(-1)?.date;
  if (!first || !lastWeighIn) return null;
  const byDate = new Map(ordered.map((record) => [record.date, record]));
  const checks: ForecastCheck[] = [];
  let end = lastWeighIn;
  while (checks.length < MAX_CHECKS && addDays(end, -HORIZON_DAYS) >= first) {
    let found: ForecastCheck | null = null;
    for (let shift = 0; shift <= MAX_SHIFT && !found; shift += 1)
      found = checkFrom(addDays(end, -HORIZON_DAYS - shift), ordered, byDate, options);
    if (found) checks.push(found);
    end = found ? found.from : addDays(end, -HORIZON_DAYS);
  }
  if (!checks.length) return null;
  return {
    checks,
    meanErrorKg: mean(checks.map((check) => Math.abs(check.errorKg))),
    stillMeanErrorKg: mean(checks.map((check) => Math.abs(check.stillErrorKg))),
    biasKg: mean(checks.map((check) => check.errorKg)),
    inside: checks.filter((check) => check.inside).length,
  };
}

/** Lo que dicen las comparaciones, sin juzgar con pocas. */
export function accuracyText(accuracy: ForecastAccuracy): string {
  const { checks, meanErrorKg, stillMeanErrorKg, biasKg, inside } = accuracy;
  if (checks.length < ENOUGH_CHECKS)
    return `Todavía es poco para juzgar: hacen falta ${ENOUGH_CHECKS} comparaciones.`;
  const better =
    meanErrorKg < stillMeanErrorKg * 0.9
      ? "El motor acierta más que suponer que tu peso no cambia."
      : meanErrorKg > stillMeanErrorKg * 1.1
        ? "Suponer que tu peso no cambia habría acertado más: toma las predicciones con cautela."
        : "Acierta más o menos lo mismo que suponer que tu peso no cambia, algo normal si está estable.";
  // Un sesgo solo se menciona si es casi todo el error.
  const side =
    Math.abs(biasKg) > 0.7 * meanErrorKg && Math.abs(biasKg) >= 0.3
      ? ` Sueles pesar ${biasKg > 0 ? "más" : "menos"} de lo que espera: revisa si cambió tu forma de anotar.`
      : "";
  return `${better} ${inside} de ${checks.length} cayeron dentro de su margen.${side}`;
}
