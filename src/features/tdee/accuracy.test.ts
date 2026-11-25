import { describe, expect, it } from "vitest";

import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { accuracyText, forecastAccuracy, type ForecastCheck } from "@/src/features/tdee/accuracy";
import { addDays } from "@/src/lib/dates";

function noise(seed: number) {
  let state = seed;
  const next = () => (state = (state * 16807) % 2147483647) / 2147483647;
  return () => Math.sqrt(-2 * Math.log(next())) * Math.cos(2 * Math.PI * next());
}

/** Una persona simulada que gasta `tdee` y cuya báscula varía `sd` kg. */
function person({
  days,
  eat,
  tdee = 2500,
  density = 7700,
  sd = 0.3,
  seed = 11,
}: {
  days: number;
  eat: (day: number) => number;
  tdee?: number;
  density?: number;
  sd?: number;
  seed?: number;
}): DailyBiometrics[] {
  const gauss = noise(seed);
  let weight = 80;
  return Array.from({ length: days }, (_, index) => {
    const date = addDays("2026-06-01", index);
    const caloriesIn = Math.round(eat(index));
    const record = {
      id: date,
      date,
      weightKg: weight + sd * gauss(),
      caloriesIn,
      proteinG: 140,
      carbsG: 250,
      fatsG: 70,
    };
    weight += (caloriesIn - tdee) / density;
    return record;
  });
}

describe("medir el acierto", () => {
  it("sin 14 días después de activar el motor no hay nada que comparar", () => {
    expect(forecastAccuracy([])).toBeNull();
    expect(forecastAccuracy(person({ days: 27, eat: () => 2000 }))).toBeNull();
  });

  it("compara tramos seguidos de 14 días que no se repiten", () => {
    const result = forecastAccuracy(person({ days: 85, eat: () => 2000 }));
    expect(result?.checks).toHaveLength(5);
    result?.checks.forEach((check, index, all) => {
      expect(check.to).toBe(addDays(check.from, 14));
      if (index) expect(check.to).toBe(all[index - 1].from);
    });
    expect(forecastAccuracy(person({ days: 200, eat: () => 2000 }))?.checks).toHaveLength(6);
  });

  it("no mira el futuro: cambiar lo de después no cambia lo que esperaba", () => {
    const records = person({ days: 29, eat: () => 2000 });
    const changed = records.map((record, index) =>
      index > 14 ? { ...record, weightKg: (record.weightKg ?? 0) + 5 } : record,
    );
    const [before] = forecastAccuracy(records)?.checks ?? [];
    const [after] = forecastAccuracy(changed)?.checks ?? [];
    expect(before.from).toBe(records[14].date);
    expect(after.predictedKg).toBeCloseTo(before.predictedKg, 6);
    expect(after.errorKg).toBeCloseTo(before.errorKg + 5, 6);
    expect(after.inside).toBe(false);
  });

  it("acierta más que suponer que el peso no cambia cuando se pierde peso", () => {
    const result = forecastAccuracy(person({ days: 85, eat: () => 1900 }));
    expect(result?.meanErrorKg).toBeLessThan(0.5);
    expect(result?.stillMeanErrorKg).toBeGreaterThan(0.8);
    expect(result && accuracyText(result)).toContain("acierta más");
  });

  it("usa lo que se comió de verdad: salirse del plan no cuenta como error del motor", () => {
    const steady = person({ days: 29, eat: () => 2000, sd: 0.1 });
    const off = person({ days: 29, eat: (day) => (day > 14 ? 3200 : 2000), sd: 0.1 });
    const a = forecastAccuracy(steady)?.checks[0] as ForecastCheck;
    const b = forecastAccuracy(off)?.checks[0] as ForecastCheck;
    expect(b.predictedKg).toBeGreaterThan(a.predictedKg + 1.5);
    expect(Math.abs(b.errorKg - a.errorKg)).toBeLessThan(0.15);
  });

  it("salta los tramos sin comida o sin pesajes suficientes", () => {
    const records = person({ days: 57, eat: () => 2000 });
    const gap = (from: number, to: number, patch: Partial<DailyBiometrics>) =>
      records.map((record, index) => (index >= from && index <= to ? { ...record, ...patch } : record));
    expect(forecastAccuracy(records)?.checks).toHaveLength(3);
    // Sin comida anotada cinco días del último tramo.
    const noFood = forecastAccuracy(gap(46, 50, { caloriesIn: 0 }));
    expect(noFood?.checks.map((check) => check.to)).not.toContain(records[56].date);
    // Sin pesajes al final del tramo del medio.
    const noScale = forecastAccuracy(gap(39, 41, { weightKg: null }));
    for (const check of noScale?.checks ?? [])
      expect([39, 40, 41].map((index) => records[index].date)).not.toContain(check.from);
  });

  // Describe esta simulación; no es una garantía para cualquier persona.
  it("el margen contiene la mayoría de las comparaciones", () => {
    const all = Array.from({ length: 20 }, (_, run) => {
      const gauss = noise(500 + run);
      return forecastAccuracy(
        person({ days: 71, eat: () => 2100 + 250 * gauss(), seed: 900 + run, sd: 0.4 }),
      );
    });
    const checks = all.flatMap((item) => item?.checks ?? []);
    expect(checks.length).toBeGreaterThanOrEqual(75);
    expect(checks.filter((check) => check.inside).length / checks.length).toBeGreaterThan(0.85);
  }, 30_000);

  it("comiendo parejo no distingue la energía por kilo: 5900 y 9400 aciertan casi igual", () => {
    const at = (density: number) =>
      forecastAccuracy(person({ days: 71, eat: () => 2000, density, sd: 0.2 }))?.meanErrorKg ?? 9;
    expect(Math.abs(at(5900) - at(9400))).toBeLessThan(0.15);
  });

  it("con pocas comparaciones no juzga, y solo menciona un sesgo claro", () => {
    const base = { from: "", to: "", predictedKg: 0, actualKg: 0, marginKg: 1, inside: true };
    const of = (errors: number[], still = 1) => ({
      checks: errors.map((errorKg) => ({ ...base, errorKg, stillErrorKg: still })),
      meanErrorKg: errors.reduce((sum, value) => sum + Math.abs(value), 0) / errors.length,
      stillMeanErrorKg: still,
      biasKg: errors.reduce((sum, value) => sum + value, 0) / errors.length,
      inside: errors.length,
    });
    expect(accuracyText(of([0.1, 0.2]))).toContain("poco para juzgar");
    expect(accuracyText(of([0.4, 0.5, 0.4]))).toContain("Sueles pesar más");
    expect(accuracyText(of([0.4, -0.5, 0.4]))).not.toContain("Sueles");
    expect(accuracyText(of([1.5, -1.5, 1.4]))).toContain("con cautela");
    expect(accuracyText(of([1, -1, 1]))).toContain("más o menos lo mismo");
  });
});
