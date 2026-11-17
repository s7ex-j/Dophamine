import { describe, expect, it } from "vitest";

import { buildNutritionProfile } from "@/src/features/profile/profile";
import { macroSplit, targetsForWeekday } from "@/src/features/profile/targets";

const base = {
  ...buildNutritionProfile({
    age: 25,
    sex: "male",
    heightCm: 175,
    weightKg: 70,
    activity: "moderate",
    goal: "maintain",
  }),
  calorieTarget: 2500,
  proteinTarget: 140,
  fatsTarget: 70,
};
const training = ["mon", "tue", "thu", "fri"];
const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const weeklyAverage = (profile: typeof base) =>
  WEEK.reduce((sum, day) => sum + targetsForWeekday(profile, day, training).calories, 0) / 7;

describe("metas por día", () => {
  it("sin cambios, todos los días son iguales y el reparto es el del plan inicial", () => {
    expect(targetsForWeekday(base, "mon", training)).toEqual({
      calories: 2500,
      offset: 0,
      protein: 140,
      fats: 70,
      carbs: 328,
    });
  });

  it("un plan guardado con reparto por entreno o a mano también queda igual todos los días", () => {
    const training_ = { ...base, calorieSchedule: "training" as const, trainingDayExtra: 300 };
    const custom = { ...base, calorieSchedule: "custom" as const, customDayOffsets: { sat: 700 } };
    for (const profile of [training_, custom])
      for (const day of ["mon", "sat", "sun"])
        expect(targetsForWeekday(profile, day, training).calories).toBe(2500);
  });
});

describe("tipos de plan", () => {
  it("cada tipo reparte carbos y grasas distinto, con las mismas calorías", () => {
    const kcal = (split: { protein: number; carbs: number; fats: number }) =>
      split.protein * 4 + split.carbs * 4 + split.fats * 9;
    const balanced = macroSplit({ ...base, dietType: "balanced" }, 2500);
    const low = macroSplit({ ...base, dietType: "low_carb" }, 2500);
    const keto = macroSplit({ ...base, dietType: "keto" }, 2500);
    const high = macroSplit({ ...base, dietType: "high_protein" }, 2500);
    expect(balanced).toEqual({ protein: 140, fats: 83, carbs: 298 });
    expect(low.carbs).toBeLessThan(balanced.carbs);
    expect(keto).toMatchObject({ carbs: 30, protein: 140 });
    expect(high.protein).toBe(175);
    for (const split of [balanced, low, keto, high]) expect(Math.abs(kcal(split) - 2500)).toBeLessThan(12);
  });
});
