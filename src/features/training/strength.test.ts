import { describe, expect, it } from "vitest";

import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { analyzeMetabolism } from "@/src/features/tdee/tdee";
import { estimatedOneRepMax } from "./strength";

describe("1RM estimado", () => {
  it("aplica Epley entre 1 y 12 repeticiones", () => {
    expect(estimatedOneRepMax(100, 1)).toBe(100);
    expect(estimatedOneRepMax(100, 5)).toBe(116.7);
    expect(estimatedOneRepMax(80, 10)).toBe(106.7);
  });

  it("no estima con datos que no sirven", () => {
    expect(estimatedOneRepMax(100, 15)).toBeNull();
    expect(estimatedOneRepMax(100, 0)).toBeNull();
    expect(estimatedOneRepMax(0, 5)).toBeNull();
  });
});

describe("días con comida y sin pesaje", () => {
  const day = (index: number, weightKg: number | null, caloriesIn: number): DailyBiometrics => ({
    id: String(index),
    date: new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10),
    weightKg,
    caloriesIn,
    proteinG: 0,
    carbsG: 0,
    fatsG: 0,
  });

  it("la tendencia usa solo los pesajes y la ingesta cuenta todos los días", () => {
    // 20 días de comida; pesaje un día sí y otro no.
    const records = Array.from({ length: 20 }, (_, index) => day(index, index % 2 === 0 ? 80 : null, 2400));
    const analysis = analyzeMetabolism(records);
    expect(analysis.points).toHaveLength(10);
    expect(analysis.loggedDays).toBe(20);
    expect(analysis.points.every((point) => point.weightKg === 80)).toBe(true);
    // Peso estable comiendo 2400 kcal: el gasto estimado es 2400.
    expect(analysis.tdee).toBeNull(); // 10 pesajes: aún faltan para los 14 que pide la tendencia
  });

  it("con suficientes pesajes estima el gasto aunque haya días sin pesarse", () => {
    const records = Array.from({ length: 30 }, (_, index) => day(index, index % 2 === 0 ? 80 : null, 2400));
    const analysis = analyzeMetabolism(records);
    expect(analysis.points).toHaveLength(15);
    expect(analysis.tdee).toBe(2400);
    expect(analysis.weightDaysLast7).toBeGreaterThanOrEqual(3);
  });

  it("un día sin pesaje ni comida no rompe el cálculo", () => {
    expect(analyzeMetabolism([day(0, null, 0)]).points).toEqual([]);
  });
});
