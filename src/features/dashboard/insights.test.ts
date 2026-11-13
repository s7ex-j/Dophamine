import { describe, expect, it } from "vitest";

import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { buildNutritionProfile } from "@/src/features/profile/profile";
import { buildInsight, isInsightMetric, loggingLevel, rangeDates } from "./insights";

const today = "2026-11-12";
const profile = {
  ...buildNutritionProfile({
    age: 18,
    sex: "male",
    heightCm: 170,
    weightKg: 56,
    activity: "light",
    goal: "gain",
  }),
  goalWeightKg: 62,
};
const records: DailyBiometrics[] = rangeDates("1M", today).map((date, index) => ({
  id: date,
  date,
  weightKg: 56 + index * 0.05,
  caloriesIn: 2800,
  proteinG: 110,
  carbsG: 380,
  fatsG: 62,
  bodyFatPct: 15,
}));
const data = { records, profile, sleep: [], today };

describe("pantallas de detalle", () => {
  it("arma los días del rango terminando hoy", () => {
    const dates = rangeDates("1S", today);
    expect(dates).toHaveLength(7);
    expect(dates.at(-1)).toBe(today);
    expect(dates[0]).toBe("2026-11-06");
    expect(rangeDates("1A", today)).toHaveLength(365);
  });

  it("peso: pesajes, tendencia, meta y llegada estimada", () => {
    const insight = buildInsight("weight", "1M", data);
    expect(insight.series.map((item) => item.kind)).toEqual(["dots", "line"]);
    expect(insight.series[0].values).toHaveLength(30);
    expect(insight.reference).toEqual({ value: 62, label: "Meta" });
    expect(insight.stats.map((item) => item.label)).toContain("Llegada estimada a la meta");
    expect(insight.empty).toBeUndefined();
  });

  it("gasto y balance con datos suficientes", () => {
    const expenditure = buildInsight("expenditure", "1M", data);
    expect(expenditure.series[0].values.filter((value) => value !== null).length).toBeGreaterThan(10);
    expect(expenditure.stats[1].label).toBe("Margen aproximado");
    const balance = buildInsight("balance", "1S", data);
    expect(balance.series[0].kind).toBe("bars");
    expect(balance.reference?.value).toBe(0);
  });

  it("macros apiladas en kcal con la meta como referencia", () => {
    const macros = buildInsight("macros", "1S", data);
    expect(macros.series.map((item) => item.values.at(-1))).toEqual([440, 1520, 558]);
    expect(macros.reference?.value).toBe(profile.calorieTarget);
  });

  it("explica qué falta cuando no hay datos", () => {
    const empty = { records: [], profile, sleep: [], today };
    expect(buildInsight("weight", "1M", empty).empty).toContain("dos días");
    expect(buildInsight("expenditure", "1M", empty).empty).toContain("14 días");
    expect(buildInsight("sleep", "1M", empty).empty).toContain("sueño");
    expect(buildInsight("composition", "1M", empty).empty).toContain("% de grasa");
  });

  it("sueño en horas con la meta de 8", () => {
    const sleep = [
      { id: "1", date: today, bedtime: "23:30", wakeTime: "07:00", quality: 4, source: "manual" as const },
    ];
    const insight = buildInsight("sleep", "1S", { ...data, sleep });
    expect(insight.series[0].values.at(-1)).toBe(7.5);
    expect(insight.stats[0].value).toBe("7 h 30 min");
  });

  it("constancia: nivel de registro por día y racha", () => {
    expect(loggingLevel(records[0], false)).toBe(3);
    expect(loggingLevel({ ...records[0], weightKg: null }, false)).toBe(2);
    expect(loggingLevel(undefined, true)).toBe(1);
    expect(loggingLevel(undefined, false)).toBe(0);
    const consistency = buildInsight("consistency", "1M", data);
    expect(consistency.stats.find((item) => item.label === "Racha actual")?.value).toBe("30 días");
  });

  it("reconoce los nombres de métricas válidos", () => {
    expect(isInsightMetric("weight")).toBe(true);
    expect(isInsightMetric("otra")).toBe(false);
  });
});
