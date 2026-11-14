import { describe, expect, it } from "vitest";
import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { buildNutritionProfile } from "@/src/features/profile/profile";
import {
  analyzeMetabolism,
  energyBalance,
  energyPerKg,
  expenditureSeries,
  KCAL_PER_KG_DEFAULT,
  linearTrend,
  trendPoints,
  weeklyRecommendation,
} from "@/src/features/tdee/tdee";

function days(
  count: number,
  record: (index: number) => { weightKg: number; caloriesIn: number },
): DailyBiometrics[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10);
    return { id: date, date, proteinG: 0, carbsG: 0, fatsG: 0, ...record(index) };
  });
}

const profile = buildNutritionProfile({
  age: 25,
  sex: "male",
  heightCm: 180,
  weightKg: 75,
  activity: "moderate",
  goal: "maintain",
});

describe("analyzeMetabolism", () => {
  it("no estima el TDEE con menos de 14 días de registros", () => {
    const analysis = analyzeMetabolism(days(13, () => ({ weightKg: 75, caloriesIn: 2500 })));
    expect(analysis.status).toBe("building");
    expect(analysis.tdee).toBeNull();
  });

  it("con peso estable, el TDEE es la ingesta media", () => {
    const analysis = analyzeMetabolism(days(21, () => ({ weightKg: 75, caloriesIn: 2500 })));
    expect(analysis.status).toBe("updating");
    expect(analysis.weeklyRateKg).toBeCloseTo(0);
    expect(analysis.tdee).toBe(2500);
  });

  it("si el peso baja, el gasto estimado supera a la ingesta", () => {
    const analysis = analyzeMetabolism(
      days(28, (index) => ({ weightKg: 80 - index * 0.07, caloriesIn: 2200 })),
    );
    expect(analysis.weeklyRateKg).toBeLessThan(0);
    expect(analysis.tdee).toBeGreaterThan(2200);
  });

  it("ordena los registros por fecha antes de calcular la tendencia", () => {
    const ordered = days(21, (index) => ({ weightKg: 75 + index * 0.05, caloriesIn: 2600 }));
    expect(analyzeMetabolism([...ordered].reverse())).toEqual(analyzeMetabolism(ordered));
  });

  it("pasa a pausa si la última semana tiene pocos registros de ingesta", () => {
    const analysis = analyzeMetabolism(
      days(21, (index) => ({ weightKg: 75, caloriesIn: index < 14 || index === 20 ? 2500 : 0 })),
    );
    expect(analysis.nutritionDaysLast7).toBe(1);
    expect(analysis.status).toBe("holding");
  });
});

describe("weeklyRecommendation", () => {
  it("pide más registros si todavía no hay TDEE", () => {
    const analysis = analyzeMetabolism(days(3, () => ({ weightKg: 75, caloriesIn: 2500 })));
    expect(weeklyRecommendation(analysis, "maintain", 75)).toContain("14 días");
  });

  it("mantiene el plan cuando la tendencia coincide con el objetivo", () => {
    const analysis = analyzeMetabolism(days(21, () => ({ weightKg: 75, caloriesIn: 2500 })));
    expect(weeklyRecommendation(analysis, "maintain", 75)).toContain("Mantén el plan");
  });
});

describe("gasto y balance para el Panel", () => {
  const steady = days(30, () => ({ weightKg: 75, caloriesIn: 2500 }));

  it("da el gasto de cada día desde que hay datos suficientes", () => {
    const series = expenditureSeries(steady, 14);
    expect(series.length).toBeGreaterThan(0);
    expect(series.every((point) => point.tdee === 2500)).toBe(true);
    expect(series.at(-1)?.date).toBe(steady.at(-1)?.date);
    expect(expenditureSeries(days(5, () => ({ weightKg: 75, caloriesIn: 2500 })))).toEqual([]);
  });

  it("calcula el balance de los días con ingesta", () => {
    const balance = energyBalance(
      [...steady.slice(-3), { ...steady[0], date: "2026-03-01", caloriesIn: 0 }],
      2700,
    );
    expect(balance).toHaveLength(3);
    expect(balance.every((day) => day.balance === -200)).toBe(true);
    expect(energyBalance(steady, null)).toEqual([]);
  });
});

describe("precisión del gasto", () => {
  it("ajusta una recta y da su error", () => {
    expect(linearTrend([0, 1, 2, 3], [1, 3, 5, 7])).toEqual({ slope: 2, standardError: 0 });
    expect(linearTrend([0, 1, 2, 3], [1, 2, 4, 3]).standardError).toBeGreaterThan(0);
    expect(linearTrend([0, 1], [1, 2]).slope).toBe(0);
  });

  it("los días incompletos no cuentan para la ingesta media", () => {
    const records = days(21, (index) => ({ weightKg: 75, caloriesIn: index % 7 === 3 ? 900 : 2500 }));
    for (const record of records) if (record.caloriesIn === 900) record.partial = true;
    const analysis = analyzeMetabolism(records);
    expect(analysis.tdee).toBe(2500);
    expect(analysis.partialDays).toBe(3);
    expect(analysis.loggedDays).toBe(18);
  });

  it("un salto de agua pesa menos en la tendencia", () => {
    const records = days(10, () => ({ weightKg: 75, caloriesIn: 2500 }));
    records.forEach((record) => (record.waterPct = 58));
    records[9] = { ...records[9], weightKg: 76.5, waterPct: 61 };
    const points = trendPoints(records);
    expect(points.at(-1)?.damped).toBe(true);
    expect(points.at(-1)?.trendKg).toBeCloseTo(75.15, 2);
    const plain = trendPoints(days(10, (index) => ({ weightKg: index === 9 ? 75.5 : 75, caloriesIn: 2500 })));
    expect(plain.at(-1)?.damped).toBeUndefined();
  });

  it("usa la energía real del tejido cuando hay composición medida", () => {
    expect(energyPerKg(days(20, () => ({ weightKg: 75, caloriesIn: 2500 })))).toBe(KCAL_PER_KG_DEFAULT);
    // Sube 2 kg y el % de grasa baja: casi todo es masa magra, que aporta pocas kcal por kg.
    const lean = days(20, (index) => ({ weightKg: 70 + index * 0.1, caloriesIn: 2800 }));
    lean.forEach((record, index) => (record.bodyFatPct = 15 - index * 0.05));
    expect(energyPerKg(lean)).toBeLessThan(3000);
    // Baja 2 kg y casi todo es grasa.
    const fat = days(20, (index) => ({ weightKg: 80 - index * 0.1, caloriesIn: 2000 }));
    fat.forEach((record, index) => (record.bodyFatPct = 20 - index * 0.11));
    expect(energyPerKg(fat)).toBeGreaterThan(8500);
  });

  it("da un margen que crece con el ruido del peso", () => {
    const steady = analyzeMetabolism(days(21, () => ({ weightKg: 75, caloriesIn: 2500 })));
    const noisy = analyzeMetabolism(
      days(21, (index) => ({ weightKg: 75 + (index % 2 ? 0.8 : -0.8), caloriesIn: 2500 })),
    );
    expect(steady.tdeeMargin).toBe(80);
    expect(noisy.tdeeMargin ?? 0).toBeGreaterThan(steady.tdeeMargin ?? 0);
  });
});
