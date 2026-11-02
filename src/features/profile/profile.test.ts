import { describe, expect, it } from "vitest";
import { buildNutritionProfile, withCalorieTarget } from "@/src/features/profile/profile";

describe("buildNutritionProfile", () => {
  it("aplica Mifflin-St Jeor, el factor de actividad y reparte los macros", () => {
    // BMR = 10·75 + 6.25·180 − 5·25 + 5 = 1755; × 1.55 = 2720
    const profile = buildNutritionProfile({ age: 25, sex: "male", heightCm: 180, weightKg: 75, activity: "moderate", goal: "maintain" });
    expect(profile.calorieTarget).toBe(2720);
    expect(profile.proteinTarget).toBe(135);
    expect(profile.fatsTarget).toBe(60);
    expect(profile.carbsTarget).toBe(410);
  });

  it("usa la constante femenina y el ajuste del objetivo", () => {
    // BMR = 10·60 + 6.25·165 − 5·30 − 161 = 1320.25; × 1.375 − 350 = 1465
    const profile = buildNutritionProfile({ age: 30, sex: "female", heightCm: 165, weightKg: 60, activity: "light", goal: "lose" });
    expect(profile.calorieTarget).toBe(1465);
  });

  it("nunca propone menos de 1200 kcal", () => {
    const profile = buildNutritionProfile({ age: 70, sex: "female", heightCm: 145, weightKg: 40, activity: "low", goal: "lose" });
    expect(profile.calorieTarget).toBe(1200);
  });
});

describe("withCalorieTarget", () => {
  const base = buildNutritionProfile({ age: 25, sex: "male", heightCm: 180, weightKg: 75, activity: "moderate", goal: "maintain" });

  it("recalcula solo los carbohidratos y conserva proteína y grasas", () => {
    const next = withCalorieTarget(base, 2820);
    expect(next.calorieTarget).toBe(2820);
    expect(next.proteinTarget).toBe(base.proteinTarget);
    expect(next.fatsTarget).toBe(base.fatsTarget);
    expect(next.carbsTarget).toBe(base.carbsTarget + 25);
  });

  it("respeta el mínimo de 1200 kcal", () => {
    const next = withCalorieTarget(base, 500);
    expect(next.calorieTarget).toBe(1200);
    expect(next.carbsTarget).toBe(30);
  });

  it("no deja carbohidratos negativos si proteína y grasas ya cubren el objetivo", () => {
    // 120 kg: 216 g de proteína (864 kcal) + 96 g de grasa (864 kcal) > 1200 kcal
    const heavy = buildNutritionProfile({ age: 40, sex: "male", heightCm: 175, weightKg: 120, activity: "low", goal: "lose" });
    expect(withCalorieTarget(heavy, 1200).carbsTarget).toBe(0);
  });
});
