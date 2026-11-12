import { describe, expect, it } from "vitest";

import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { analyzeMetabolism } from "@/src/features/tdee/tdee";
import { describePlates, estimatedOneRepMax, plateLoad, PLATES } from "./strength";

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

describe("calculadora de discos", () => {
  it("reparte el peso en discos por lado, del más pesado al más liviano", () => {
    const load = plateLoad(100, 20, PLATES.kg);
    expect(load).toEqual({ perSide: [25, 15], loaded: 100, missing: 0 });
    expect(describePlates(load!)).toBe("25 + 15");
    expect(plateLoad(62.5, 20, PLATES.kg)?.perSide).toEqual([20, 1.25]);
    expect(plateLoad(225, 45, PLATES.lb)?.perSide).toEqual([45, 45]);
  });

  it("avisa cuánto falta si no hay discos tan pequeños", () => {
    expect(plateLoad(61, 20, PLATES.kg)).toEqual({ perSide: [20], loaded: 60, missing: 1 });
  });

  it("solo la barra, y nada si se pide menos que la barra", () => {
    expect(describePlates(plateLoad(20, 20, PLATES.kg)!)).toBe("solo la barra");
    expect(plateLoad(15, 20, PLATES.kg)).toBeNull();
    expect(plateLoad(0, 20, PLATES.kg)).toBeNull();
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
