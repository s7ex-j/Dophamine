import { describe, expect, it } from "vitest";

import {
  activityCategory,
  basalRate,
  estimatedEnergyRequirement,
  estimateExpenditure,
  mifflinStJeor,
  type ExpenditureInput,
} from "./expenditure";
import { answersFrom, bodyFatPresets, planInputFrom, stepError, stepsFor, type Answers } from "./onboarding";
import {
  basalMetabolicRate,
  buildNutritionProfile,
  goalCalorieOffset,
  goalProgress,
  planEstimate,
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
  activity: "light",
  trainingDays: 4,
  sessionMinutes: 60,
  trainingType: "strength",
  experience: "intermediate",
  knownIntake: "",
  recentTrend: "stable",
  goalWeight: "74",
  pace: "moderate",
  proteinLevel: "high",
  adjustMode: "auto",
  checkInDays: 3,
  mealStyle: "numbered",
  mealsPerDay: 5,
};

// El caso que reportó Jharol: 18 años, 170 cm, 56 kg, 15 % de grasa, estudiante que entrena fuerza.
const young: ExpenditureInput = {
  sex: "male",
  age: 18,
  heightCm: 170,
  weightKg: 56,
  bodyFatPct: 15,
  activity: "light",
  trainingDays: 5,
  sessionMinutes: 60,
  trainingType: "strength",
};

describe("evaluación inicial", () => {
  it("salta el paso de peso meta al elegir mantenimiento", () => {
    expect(stepsFor("lose")).toContain("target");
    expect(stepsFor("maintain")).not.toContain("target");
    expect(stepsFor("maintain").at(-1)).toBe("summary");
    expect(stepsFor("gain")).toEqual(expect.arrayContaining(["training", "intake"]));
  });

  it("empieza con valores por defecto y sin datos personales", () => {
    const empty = answersFrom(null, null);
    expect(empty.age).toBe("");
    expect(empty.adjustMode).toBe("collaborative");
    expect(empty.checkInDays).toBe(7);
    expect(empty.trainingDays).toBe(3);
    expect(stepError("body", empty)).not.toBeNull();
  });

  it("al editar un plan anterior no cuenta el entrenamiento dos veces", () => {
    const old = buildNutritionProfile({
      age: 25,
      sex: "male",
      heightCm: 180,
      weightKg: 80,
      activity: "high",
      goal: "maintain",
    });
    expect(answersFrom(old, 80).activity).toBe("light");
    const current = buildNutritionProfile(
      planInputFrom({ ...answers, activity: "high" }, null, "2026-11-12"),
    );
    expect(answersFrom(current, 80).activity).toBe("high");
  });

  it("valida cada paso", () => {
    expect(stepError("body", answers)).toBeNull();
    expect(stepError("composition", answers)).toBeNull();
    expect(stepError("composition", { ...answers, bodyFat: "80" })).toContain("entre 3 y 60");
    expect(stepError("intake", answers)).toBeNull();
    expect(stepError("intake", { ...answers, knownIntake: "300" })).toContain("entre 1000 y 6000");
    expect(stepError("target", answers)).toBeNull();
    expect(stepError("target", { ...answers, goalWeight: "85" })).toContain("menor");
    expect(stepError("target", { ...answers, goal: "gain" })).toContain("mayor");
    expect(stepError("target", { ...answers, goalWeight: "" })).toContain("peso meta");
  });

  it("ofrece referencias de % de grasa distintas para hombre y mujer", () => {
    expect(bodyFatPresets("male").map((item) => item.value)).toEqual(["10", "15", "20", "25", "30"]);
    expect(Number(bodyFatPresets("female")[0].value)).toBeGreaterThan(
      Number(bodyFatPresets("male")[0].value),
    );
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

  it("mantenimiento no guarda peso meta ni ritmo, y sin entreno no guarda minutos", () => {
    const input = planInputFrom({ ...answers, goal: "maintain", trainingDays: 0 }, null, "2026-11-11");
    expect(input.goalWeightKg).toBeUndefined();
    expect(input.pace).toBeUndefined();
    expect(input.sessionMinutes).toBe(0);
    expect(input.knownIntake).toBeUndefined();
  });
});

describe("gasto energético inicial", () => {
  it("promedia Mifflin con una ecuación de masa magra cuando hay % de grasa", () => {
    expect(mifflinStJeor(young)).toBe(1537.5);
    // Entrena 5 días: Cunningham, 500 + 22 × 47.6 = 1547.2
    expect(basalRate(young)).toBeCloseTo((1537.5 + 1547.2) / 2, 1);
    // Sin entrenamiento regular: Katch-McArdle, 370 + 21.6 × 47.6 = 1398.2
    expect(basalRate({ ...young, trainingDays: 1 })).toBeCloseTo((1537.5 + 1398.16) / 2, 1);
    expect(basalRate({ ...young, bodyFatPct: undefined })).toBe(1537.5);
  });

  it("sube de categoría de actividad con las horas de entrenamiento", () => {
    expect(activityCategory({ activity: "low", trainingDays: 0, sessionMinutes: 0 })).toBe(0);
    expect(activityCategory({ activity: "light", trainingDays: 5, sessionMinutes: 60 })).toBe(2);
    expect(activityCategory({ activity: "light", trainingDays: 6, sessionMinutes: 90 })).toBe(3);
    expect(activityCategory({ activity: "high", trainingDays: 6, sessionMinutes: 90 })).toBe(3);
  });

  it("usa la ecuación de adolescentes hasta los 18 años y la de adultos después", () => {
    // 88.5 − 61.9·18 + 1.26·(26.7·56 + 903·1.70) + 25
    expect(estimatedEnergyRequirement(young)).toBeCloseTo(2817.5, 0);
    // 662 − 9.53·19 + 1.25·(15.91·56 + 539.6·1.70)
    expect(estimatedEnergyRequirement({ ...young, age: 19 })).toBeCloseTo(2741.3, 0);
  });

  it("un joven liviano que entrena 5 días queda cerca de 2500 kcal de mantenimiento", () => {
    const estimate = estimateExpenditure(young);
    expect(estimate.tdee).toBeGreaterThanOrEqual(2450);
    expect(estimate.tdee).toBeLessThanOrEqual(2600);
    expect(estimate.bmr + estimate.dailyActivity + estimate.training + estimate.calibration).toBeCloseTo(
      estimate.tdee,
      -1,
    );
    expect(estimate.usedKnownIntake).toBe(false);
  });

  it("gasta más quien se mueve más, entrena más o pesa más", () => {
    const base = estimateExpenditure(young).tdee;
    expect(estimateExpenditure({ ...young, activity: "high" }).tdee).toBeGreaterThan(base);
    expect(estimateExpenditure({ ...young, trainingDays: 0, sessionMinutes: 0 }).tdee).toBeLessThan(base);
    expect(estimateExpenditure({ ...young, trainingType: "cardio" }).tdee).toBeGreaterThan(base);
    expect(estimateExpenditure({ ...young, weightKg: 70 }).tdee).toBeGreaterThan(base);
  });

  it("le da más peso a lo que la persona ya come, según lo que hizo su peso", () => {
    const formula = estimateExpenditure(young).tdee;
    const stable = estimateExpenditure({ ...young, knownIntake: 3000, recentTrend: "stable" });
    expect(stable.usedKnownIntake).toBe(true);
    expect(stable.tdee).toBe(Math.round(3000 * 0.6 + formula * 0.4));
    // Comiendo lo mismo: si sube de peso gasta menos de lo que come; si baja, más.
    expect(estimateExpenditure({ ...young, knownIntake: 3000, recentTrend: "gaining" }).tdee).toBeLessThan(
      stable.tdee,
    );
    expect(estimateExpenditure({ ...young, knownIntake: 3000, recentTrend: "losing" }).tdee).toBeGreaterThan(
      stable.tdee,
    );
    expect(estimateExpenditure({ ...young, knownIntake: 400 }).usedKnownIntake).toBe(false);
  });
});

describe("plan con ritmo, experiencia y composición", () => {
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

  it("en volumen, quien empieza apunta a ganar más rápido que quien lleva años", () => {
    const rate = (experience: "beginner" | "intermediate" | "advanced") =>
      targetWeeklyRateKg({ goal: "gain", pace: "moderate", experience }, 56) as number;
    expect(rate("beginner")).toBeCloseTo(0.21);
    expect(rate("intermediate")).toBeCloseTo(0.14);
    expect(rate("advanced")).toBeCloseTo(0.084);
    // Al definir, la experiencia no cambia el ritmo.
    expect(targetWeeklyRateKg({ goal: "lose", pace: "moderate", experience: "beginner" }, 80)).toBeCloseTo(
      -0.4,
    );
  });

  it("el caso reportado: volumen a los 18 años queda por encima del mantenimiento", () => {
    const input = planInputFrom(
      {
        ...answers,
        goal: "gain",
        age: "18",
        height: "170",
        weight: "56",
        bodyFat: "15",
        trainingDays: 5,
        experience: "beginner",
        goalWeight: "62",
      },
      null,
      "2026-11-12",
    );
    const estimate = planEstimate(input);
    const profile = buildNutritionProfile(input);
    expect(estimate?.tdee).toBeGreaterThanOrEqual(2450);
    expect(profile.initialExpenditure).toBe(estimate?.tdee);
    expect(profile.calorieTarget).toBe((estimate?.tdee ?? 0) + 231);
    expect(profile.calorieTarget).toBeGreaterThan(2650);
    expect(profile.proteinTarget).toBe(112);
    expect(profile.fatsTarget).toBe(56);
  });

  it("los planes anteriores (sin datos de entrenamiento) se calculan como antes", () => {
    const base = { age: 25, sex: "male" as const, heightCm: 180, weightKg: 80 };
    expect(basalMetabolicRate(base)).toBe(1805);
    expect(basalMetabolicRate({ ...base, bodyFatPct: 20 })).toBeCloseTo(1752.4);
    const old = { ...base, activity: "moderate" as const, goal: "lose" as const, pace: "moderate" as const };
    expect(planEstimate(old)).toBeNull();
    // 1805 × 1.55 = 2797.75; − 440 = 2358
    expect(buildNutritionProfile(old).calorieTarget).toBe(2358);
    expect(buildNutritionProfile(old).initialExpenditure).toBeUndefined();
  });

  it("nunca propone menos que el metabolismo basal", () => {
    const input = planInputFrom(
      {
        ...answers,
        sex: "female",
        age: "60",
        height: "150",
        weight: "45",
        goalWeight: "40",
        pace: "fast",
        activity: "low",
        trainingDays: 0,
      },
      null,
      "2026-11-12",
    );
    const profile = buildNutritionProfile(input);
    expect(profile.calorieTarget).toBeGreaterThanOrEqual(Math.max(1200, planEstimate(input)?.bmr ?? 0));
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
