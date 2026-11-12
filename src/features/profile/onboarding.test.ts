import { describe, expect, it } from "vitest";

import { answersFrom, planInputFrom, stepError, stepsFor, type Answers } from "./onboarding";
import {
  basalMetabolicRate,
  buildNutritionProfile,
  goalCalorieOffset,
  goalProgress,
  targetWeeklyRateKg,
} from "./profile";

const answers: Answers = {
  goal: "lose",
  sex: "male",
  age: "25",
  height: "180",
  weight: "80",
  unit: "kg",
  bodyFat: "",
  activity: "moderate",
  goalWeight: "74",
  pace: "moderate",
  proteinLevel: "high",
  adjustMode: "auto",
  checkInDays: 3,
};

describe("evaluación inicial", () => {
  it("salta el paso de peso meta al elegir mantenimiento", () => {
    expect(stepsFor("lose")).toContain("target");
    expect(stepsFor("maintain")).not.toContain("target");
    expect(stepsFor("maintain").at(-1)).toBe("summary");
  });

  it("empieza con valores por defecto y sin datos personales", () => {
    const empty = answersFrom(null, null);
    expect(empty.age).toBe("");
    expect(empty.adjustMode).toBe("collaborative");
    expect(empty.checkInDays).toBe(7);
    expect(stepError("body", empty)).not.toBeNull();
  });

  it("valida cada paso", () => {
    expect(stepError("body", answers)).toBeNull();
    expect(stepError("composition", answers)).toBeNull();
    expect(stepError("composition", { ...answers, bodyFat: "80" })).toContain("entre 3 y 60");
    expect(stepError("target", answers)).toBeNull();
    expect(stepError("target", { ...answers, goalWeight: "85" })).toContain("menor");
    expect(stepError("target", { ...answers, goal: "gain" })).toContain("mayor");
    expect(stepError("target", { ...answers, goalWeight: "" })).toContain("peso meta");
  });

  it("convierte libras a kilogramos al armar el plan", () => {
    const input = planInputFrom(
      { ...answers, unit: "lb", weight: "176.4", goalWeight: "163.1" },
      null,
      "2026-11-11",
    );
    expect(input.weightKg).toBeCloseTo(80, 1);
    expect(input.goalWeightKg).toBeCloseTo(74, 1);
    expect(input.startDate).toBe("2026-11-11");
  });

  it("conserva el punto de partida al editar, salvo que cambie el objetivo", () => {
    const existing = { startWeightKg: 84, startDate: "2026-09-01", goal: "lose" as const };
    expect(planInputFrom(answers, existing, "2026-11-11")).toMatchObject({
      startWeightKg: 84,
      startDate: "2026-09-01",
    });
    const changed = planInputFrom({ ...answers, goal: "gain", goalWeight: "85" }, existing, "2026-11-11");
    expect(changed).toMatchObject({ startWeightKg: 80, startDate: "2026-11-11" });
  });

  it("mantenimiento no guarda peso meta ni ritmo", () => {
    const input = planInputFrom({ ...answers, goal: "maintain" }, null, "2026-11-11");
    expect(input.goalWeightKg).toBeUndefined();
    expect(input.pace).toBeUndefined();
  });
});

describe("plan con ritmo y composición", () => {
  it("traduce el ritmo a kg por semana y a calorías diarias", () => {
    expect(targetWeeklyRateKg({ goal: "lose", pace: "moderate" }, 80)).toBeCloseTo(-0.4);
    expect(targetWeeklyRateKg({ goal: "gain", pace: "gentle" }, 80)).toBeCloseTo(0.08);
    expect(targetWeeklyRateKg({ goal: "maintain" }, 80)).toBe(0);
    expect(targetWeeklyRateKg({ goal: "lose" }, 80)).toBeNull();
    // 0.4 kg/semana × 7700 kcal/kg ÷ 7 días = 440 kcal/día de déficit
    expect(goalCalorieOffset({ goal: "lose", pace: "moderate" }, 80)).toBe(-440);
    // Sin ritmo (planes anteriores) sigue el ajuste fijo.
    expect(goalCalorieOffset({ goal: "lose" }, 80)).toBe(-350);
  });

  it("usa la masa magra para el metabolismo basal cuando hay % de grasa", () => {
    const base = { age: 25, sex: "male" as const, heightCm: 180, weightKg: 80 };
    expect(basalMetabolicRate(base)).toBe(1805);
    // 370 + 21.6 × (80 × 0.8) = 1752.4
    expect(basalMetabolicRate({ ...base, bodyFatPct: 20 })).toBeCloseTo(1752.4);
  });

  it("arma el plan completo desde las respuestas", () => {
    const profile = buildNutritionProfile(planInputFrom(answers, null, "2026-11-11"));
    // 1805 × 1.55 = 2797.75; − 440 = 2358
    expect(profile.calorieTarget).toBe(2358);
    expect(profile.proteinTarget).toBe(160);
    expect(profile).toMatchObject({
      startWeightKg: 80,
      goalWeightKg: 74,
      adjustMode: "auto",
      checkInDays: 3,
    });
  });

  it("mide el avance hacia el peso meta y estima las semanas que faltan", () => {
    const profile = buildNutritionProfile(planInputFrom(answers, null, "2026-11-11"));
    const progress = goalProgress(profile, 77);
    expect(progress).toMatchObject({ percent: 50, remainingKg: 3, reached: false });
    // 3 kg a 0.385 kg/semana (0.5 % de 77 kg)
    expect(progress?.weeksLeft).toBe(8);
    expect(goalProgress(profile, 73.8)).toMatchObject({ percent: 100, reached: true, weeksLeft: null });
    expect(goalProgress(profile, 82)?.percent).toBe(0);
    expect(goalProgress({ ...profile, goalWeightKg: undefined }, 77)).toBeNull();
  });
});
