import { describe, expect, it } from "vitest";

import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import {
  compositionChange,
  compositionSeries,
  describeCompositionChange,
  fatFreeMassIndex,
  fatMassKg,
  invalidCompositionField,
  latestComposition,
  leanMassKg,
} from "./composition";

const day = (index: number, weightKg: number, bodyFatPct?: number | null): DailyBiometrics => ({
  id: String(index),
  date: `2026-10-${String(index + 1).padStart(2, "0")}`,
  weightKg,
  caloriesIn: 2000,
  proteinG: 150,
  carbsG: 200,
  fatsG: 60,
  bodyFatPct,
});

describe("composición corporal", () => {
  it("separa el peso en grasa y masa magra", () => {
    expect(fatMassKg(80, 20)).toBe(16);
    expect(leanMassKg(80, 20)).toBe(64);
    expect(fatFreeMassIndex(64, 180)).toBe(19.8);
  });

  it("rechaza valores fuera de rango y acepta campos vacíos", () => {
    expect(invalidCompositionField({}, 80)).toBeNull();
    expect(
      invalidCompositionField({ bodyFatPct: 18, muscleMassKg: 38, waterPct: 58, boneMassKg: 3.2 }, 80),
    ).toBeNull();
    expect(invalidCompositionField({ bodyFatPct: 90 }, 80)).toBe("% de grasa");
    expect(invalidCompositionField({ muscleMassKg: 85 }, 80)).toBe("masa muscular");
    expect(invalidCompositionField({ waterPct: 5 }, 80)).toBe("% de agua");
    expect(invalidCompositionField({ boneMassKg: 30 }, 80)).toBe("masa ósea");
  });

  it("ignora los días sin % de grasa y suaviza las lecturas", () => {
    const series = compositionSeries([day(0, 80, 20), day(1, 80), day(2, 80, 26), day(3, 80, null)]);
    expect(series).toHaveLength(2);
    // Un salto de 20 a 26 en un día es ruido: la serie solo sube una parte.
    expect(series[1].bodyFatPct).toBe(21.8);
  });

  it("no calcula un cambio con pocas mediciones o pocos días", () => {
    expect(compositionChange([day(0, 80, 20), day(9, 79, 19)])).toBeNull();
    expect(compositionChange([day(0, 80, 20), day(1, 80, 20), day(2, 80, 20)])).toBeNull();
  });

  it("mide cuánto cambió la grasa y cuánto la masa magra", () => {
    const records = Array.from({ length: 15 }, (_, index) => day(index, 80 - index * 0.1, 20 - index * 0.1));
    const change = compositionChange(records);
    expect(change?.days).toBe(14);
    expect(change?.measurements).toBe(15);
    expect(change?.weightDeltaKg).toBeLessThan(0);
    expect(change?.fatMassDeltaKg).toBeLessThan(0);
    expect(Math.abs(change?.leanMassDeltaKg ?? 9)).toBeLessThan(0.4);
    expect(describeCompositionChange(change!, "lose")).toContain("La mayor parte de lo perdido es grasa");
  });

  it("avisa cuando al bajar se pierde más masa magra que grasa", () => {
    const from = { date: "2026-10-01", weightKg: 80, bodyFatPct: 20, fatMassKg: 16, leanMassKg: 64 };
    const to = { date: "2026-10-15", weightKg: 78, bodyFatPct: 20.3, fatMassKg: 15.8, leanMassKg: 62.2 };
    const text = describeCompositionChange(
      { from, to, days: 14, measurements: 6, weightDeltaKg: -2, fatMassDeltaKg: -0.2, leanMassDeltaKg: -1.8 },
      "lose",
    );
    expect(text).toContain("más masa magra que grasa");
  });

  it("toma el último valor de cada medida aunque sean de días distintos", () => {
    const records = [
      { ...day(0, 80, 21), muscleMassKg: 37 },
      { ...day(1, 80, 20), boneMassKg: 3.1 },
      day(2, 80),
    ];
    expect(latestComposition(records)).toEqual({
      bodyFatPct: 20,
      muscleMassKg: 37,
      waterPct: null,
      boneMassKg: 3.1,
    });
  });
});
