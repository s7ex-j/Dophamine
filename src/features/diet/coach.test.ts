import { describe, expect, it } from "vitest";

import {
  applyAdvice,
  coach,
  equivalents,
  mealMinutes,
  readDayState,
  roleOf,
  type CoachInput,
  type DayState,
} from "@/src/features/diet/coach";
import { parseDietText, parseItem } from "@/src/features/diet/diet";
import { EMPTY_HEALTH, type HealthProfile } from "@/src/features/health/health";
import { tagsOfName } from "@/src/features/health/foodTags";
import { BUILTIN_FOODS } from "@/src/features/nutrition/builtin.foods";
import type { MealEntry } from "@/src/features/nutrition/meals";

const foods = BUILTIN_FOODS;
const item = (text: string) => parseItem(text, foods);
const plan = parseDietText(
  `Desayuno 7:30
- Avena 60 g
- Leche entera 250 ml
- 1 plátano de seda
Almuerzo 13:00
- Arroz blanco cocido 200 g
- Pechuga de pollo cocida 150 g
- Palta 100 g
- Mantequilla de maní 30 g
Merienda 16:30
- Pan francés 2 unidades
- Café negro sin azúcar 1 taza
Cena 20:30
- Fideos cocidos 200 g
- Tomate 100 g`,
  foods,
).plan;
const day = plan.days[0];
const state = (patch: Partial<DayState> = {}): DayState => ({ date: "2026-11-16", swaps: [], ...patch });
const input = (patch: Partial<CoachInput> = {}): CoachInput => ({
  day,
  state: state(),
  logged: [],
  now: 8 * 60,
  trainingDay: false,
  feeling: {},
  health: EMPTY_HEALTH,
  foods,
  targets: { calories: 0, protein: 0 },
  ...patch,
});
const logged = (slot: string, kcal: number): MealEntry => ({
  id: slot,
  date: "2026-11-16",
  slot,
  name: "x",
  kcal,
  proteinG: 10,
  carbsG: 10,
  fatsG: 5,
});

describe("equivalentes", () => {
  it("clasifica el papel de cada alimento", () => {
    expect(roleOf(item("Pechuga de pollo cocida 150 g"))).toBe("protein");
    expect(roleOf(item("Arroz blanco cocido 200 g"))).toBe("carbs");
    expect(roleOf(item("Palta 100 g"))).toBe("fats");
    expect(roleOf(item("Tomate 100 g"), 18)).toBe("veg");
  });

  it("propone el mismo tipo de alimento con el mismo macro principal", () => {
    const rice = item("Arroz blanco cocido 200 g");
    const options = equivalents(rice, { foods, health: EMPTY_HEALTH });
    expect(options.length).toBeGreaterThan(1);
    for (const option of options) {
      expect(roleOf(option)).toBe("carbs");
      expect(Math.abs(option.carbsG - rice.carbsG)).toBeLessThan(8);
      expect(tagsOfName(option.name).traits).not.toContain("sugar");
    }
    // Primero salen otros almidones, no fruta ni azúcar.
    expect(options[0].name).toMatch(/Quinua|Fideos|Papa|Camote|Yuca|Trigo|Choclo|Arroz integral/);
  });

  it("respeta alergias y lo que se quiere conseguir", () => {
    const health: HealthProfile = { avoid: ["fish", "egg"], conditions: [], labs: [] };
    const chicken = item("Pechuga de pollo cocida 150 g");
    const options = equivalents(chicken, { foods, health, limit: 8 });
    expect(options.some((option) => /Salmón|Atún|Huevo|Trucha/.test(option.name))).toBe(false);
    const iron = equivalents(chicken, { foods, health: EMPTY_HEALTH, want: ["iron"] });
    expect(iron.length).toBeGreaterThan(0);
    expect(iron.every((option) => tagsOfName(option.name).traits.includes("iron"))).toBe(true);
    expect(Math.abs(iron[0].proteinG - chicken.proteinG)).toBeLessThan(6);
  });
});

describe("asesor de la dieta", () => {
  it("sabe qué comida toca y cuáles ya se hicieron", () => {
    expect(mealMinutes({ slot: "lunch" })).toBe(780);
    const morning = coach(input());
    expect(morning.next?.label).toBe("Desayuno");
    const noon = coach(input({ now: 12 * 60 + 30, logged: [logged("breakfast", 500)] }));
    expect(noon.meals.map((meal) => meal.status)).toEqual(["done", "next", "pending", "pending"]);
    expect(noon.next?.label).toBe("Almuerzo");
  });

  it("pregunta la hora del entreno solo si hoy toca y no se respondió", () => {
    expect(coach(input({ trainingDay: true })).askTraining).toBe(true);
    expect(coach(input({ trainingDay: false })).askTraining).toBe(false);
    expect(coach(input({ trainingDay: true, state: state({ trainTime: 18 * 60 }) })).askTraining).toBe(false);
    expect(coach(input({ trainingDay: true, state: state({ trained: true }) })).askTraining).toBe(false);
  });

  it("las alergias mandan: propone el cambio y se aplica", () => {
    const health: HealthProfile = { avoid: ["lactose", "peanut"], conditions: [], labs: [] };
    const result = coach(input({ health }));
    const allergy = result.advice.filter((entry) => entry.kind === "allergy");
    expect(allergy.map((entry) => entry.title)).toEqual([
      "Leche entera tiene lactosa",
      "Mantequilla de maní tiene maní",
    ]);
    expect(allergy[0].swap?.item.name).not.toMatch(/Leche entera|Yogur natural entero/);
    const next = applyAdvice(state(), allergy[0]);
    const after = coach(input({ health, state: next }));
    expect(after.meals[0].items[1].name).toBe(allergy[0].swap?.item.name);
    expect(after.advice.some((entry) => entry.title.startsWith("Leche entera"))).toBe(false);
  });

  it("marca la comida de antes y después de entrenar y las ajusta", () => {
    // Entreno 15:30: el almuerzo de las 13:00 es la previa (tiene mucha grasa) y la merienda, la posterior.
    const result = coach(
      input({ trainingDay: true, now: 9 * 60, state: state({ trainTime: 15 * 60 + 30 }) }),
    );
    expect(result.meals.map((meal) => meal.around)).toEqual([undefined, "pre", "post", undefined]);
    const pre = result.advice.find((entry) => entry.id.startsWith("pre-fat"));
    expect(pre?.detail).toContain("grasa");
    expect(roleOf(pre!.swap!.item)).toBe("carbs");
    const post = result.advice.find((entry) => entry.id.startsWith("post-protein"));
    expect(post?.title).toContain("después de entrenar");
  });

  it("si entrenas lejos de toda comida, sugiere mover una", () => {
    const result = coach(
      input({ trainingDay: true, now: 8 * 60, state: state({ trainTime: 11 * 60 + 45 }) }),
    );
    // El desayuno de las 7:30 cae a más de 4 h: no hay comida previa.
    expect(result.advice.find((entry) => entry.id === "pre-move")?.detail).toContain("10:15");
  });

  it("reacciona a cómo te sientes", () => {
    const tired = coach(input({ feeling: { energy: 2, sleepMinutes: 300, stress: 5 }, now: 12 * 60 }));
    const ids = tired.advice.map((entry) => entry.id);
    expect(ids).toEqual(expect.arrayContaining(["energy-carbs", "sleep", "stress"]));
    expect(tired.advice.find((entry) => entry.id === "sleep")?.detail).toContain("Café");
    expect(coach(input({ feeling: { energy: 4, sleepMinutes: 460 } })).advice).toEqual([]);
  });

  it("usa tus condiciones: limita lo que conviene y suma lo que falta", () => {
    const health: HealthProfile = { avoid: [], conditions: ["gastritis", "lowIron"], labs: [] };
    const result = coach(input({ health }));
    const limit = result.advice.find((entry) => entry.id.startsWith("health-limit"));
    expect(limit?.title).toMatch(/Café|Tomate/);
    const favor = result.advice.find((entry) => entry.id === "health-favor-lowIron");
    expect(favor?.title).toContain("hierro");
    expect(tagsOfName(favor!.swap!.item.name).traits).toContain("iron");
  });

  it("si lo comido se apartó del plan, ajusta lo que queda", () => {
    const planned = coach(input()).planned.kcal;
    // Desayuno real 300 kcal por encima del planeado.
    const breakfast = coach(input()).meals[0].totals.kcal;
    const result = coach(
      input({
        now: 12 * 60,
        logged: [logged("breakfast", breakfast + 300)],
        targets: { calories: planned, protein: 100 },
      }),
    );
    const balance = result.advice.find((entry) => entry.kind === "balance");
    expect(balance?.title).toBe("Vas por encima de tu objetivo");
    expect(balance?.scale).toBeLessThan(1);
    const after = coach(
      input({
        now: 12 * 60,
        logged: [logged("breakfast", breakfast + 300)],
        targets: { calories: planned, protein: 100 },
        state: applyAdvice(state(), balance!),
      }),
    );
    expect(Math.abs(after.projected.kcal - planned)).toBeLessThan(planned * 0.08);
    expect(after.advice.some((entry) => entry.kind === "balance")).toBe(false);
  });

  it("el estado del día se renueva cada día", () => {
    expect(readDayState({ date: "2026-11-15", swaps: [], trainTime: 600 }, "2026-11-16")).toEqual({
      date: "2026-11-16",
      swaps: [],
    });
    expect(readDayState(null, "2026-11-16").swaps).toEqual([]);
  });
});
