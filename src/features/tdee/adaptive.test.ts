import { describe, expect, it } from "vitest";

import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import {
  adaptiveEngine,
  ENGINE_DAYS,
  forecastWeight,
  type AdaptiveEstimate,
} from "@/src/features/tdee/adaptive";
import { addDays } from "@/src/lib/dates";

// Datos sintéticos con un gasto "verdadero" conocido: así se sabe qué debe encontrar el motor.
function random(seed: number) {
  let state = seed;
  const uniform = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return (state + 0.5) / 4294967296;
  };
  return () => Math.sqrt(-2 * Math.log(uniform())) * Math.cos(2 * Math.PI * uniform());
}

type Simulation = {
  days: number;
  tdee: (day: number) => number;
  intake?: (day: number, gauss: () => number) => number;
  carbs?: (day: number) => number;
  /** kg de agua por cada 100 g de carbohidratos sobre lo habitual, al día siguiente. */
  carbEffect?: number;
  noise?: number;
  seed?: number;
  noWeight?: number[];
  partial?: number[];
  missing?: number[];
  spike?: Record<number, number>;
};

const START = "2026-03-01";

function simulate(options: Simulation): DailyBiometrics[] {
  const gauss = random(options.seed ?? 7);
  const carbsOf = options.carbs ?? (() => 250);
  const carbMean =
    Array.from({ length: options.days }, (_, day) => carbsOf(day)).reduce((sum, value) => sum + value, 0) /
    options.days;
  let weight = 80;
  let previous: { intake: number; carbs: number; tdee: number } | null = null;
  const records: DailyBiometrics[] = [];
  for (let day = 0; day < options.days; day++) {
    if (previous) weight += (previous.intake - previous.tdee) / 7700;
    const intake = Math.round(options.intake ? options.intake(day, gauss) : 2200 + 200 * gauss());
    const carbs = carbsOf(day);
    const water = previous ? ((options.carbEffect ?? 0) * (previous.carbs - carbMean)) / 100 : 0;
    const scale = weight + water + (options.noise ?? 0.3) * gauss() + (options.spike?.[day] ?? 0);
    previous = { intake, carbs, tdee: options.tdee(day) };
    if (options.missing?.includes(day)) continue;
    records.push({
      id: `d${day}`,
      date: addDays(START, day),
      weightKg: options.noWeight?.includes(day) ? null : Math.round(scale * 100) / 100,
      caloriesIn: intake,
      proteinG: 150,
      carbsG: carbs,
      fatsG: 70,
      ...(options.partial?.includes(day) ? { partial: true } : {}),
    });
  }
  return records;
}

const estimate = (records: DailyBiometrics[], priorTdee: number | null = null): AdaptiveEstimate => {
  const result = adaptiveEngine(records, { priorTdee });
  if (!result.active) throw new Error("El motor debería estar activo.");
  return result;
};

describe("motor de autoajuste: cuándo se activa", () => {
  it("espera a tener 15 días seguidos con peso y comida", () => {
    const fourteen = adaptiveEngine(simulate({ days: ENGINE_DAYS - 1, tdee: () => 2500 }));
    expect(fourteen).toEqual({ active: false, streak: 14, needed: 15 });
    expect(adaptiveEngine(simulate({ days: ENGINE_DAYS, tdee: () => 2500 })).active).toBe(true);
  });

  it("un día sin pesaje o incompleto corta la cuenta", () => {
    const broken = adaptiveEngine(simulate({ days: 24, tdee: () => 2500, noWeight: [10], partial: [20] }));
    expect(broken).toEqual({ active: false, streak: 3, needed: 15 });
  });

  it("el día de hoy a medias no rompe la racha, y una vez activo sigue con huecos", () => {
    const today = adaptiveEngine(simulate({ days: 13, tdee: () => 2500, noWeight: [12] }));
    expect(today).toMatchObject({ active: false, streak: 12 });
    const later = adaptiveEngine(simulate({ days: 30, tdee: () => 2500, missing: [20, 21], partial: [25] }));
    expect(later.active).toBe(true);
  });

  it("sin datos no falla", () => {
    expect(adaptiveEngine([])).toEqual({ active: false, streak: 0, needed: 15 });
  });
});

describe("motor de autoajuste: qué encuentra", () => {
  it("recupera el gasto verdadero aunque parta de otro valor", () => {
    for (const seed of [1, 2, 3, 4]) {
      const result = estimate(simulate({ days: 45, tdee: () => 2600, seed }), 2200);
      expect(Math.abs(result.tdee - 2600)).toBeLessThan(150);
      expect(Math.abs(result.tdee - 2600)).toBeLessThan(2.6 * result.tdeeSd + 60);
    }
  });

  it("con más días la incertidumbre baja", () => {
    const short = estimate(simulate({ days: 18, tdee: () => 2600 }));
    const long = estimate(simulate({ days: 60, tdee: () => 2600 }));
    expect(long.tdeeSd).toBeLessThan(short.tdeeSd);
    expect(long.margin).toBeLessThan(short.margin);
  });

  it("sigue un cambio de gasto y avisa de la adaptación", () => {
    const records = simulate({
      days: 90,
      tdee: (day) => (day < 50 ? 2700 : 2350),
      intake: (_, gauss) => 2200 + 150 * gauss(),
      noise: 0.25,
    });
    const result = estimate(records);
    // El promedio de todo el periodo daría ~2540; el motor se acerca al valor actual.
    expect(result.tdee).toBeLessThan(2500);
    expect(result.adaptation?.kcal).toBeLessThan(-80);
    expect(result.adaptation?.flagged).toBe("down");
    expect(result.driftKcal).toBeGreaterThan(5);
  });

  it("con gasto estable no inventa adaptación", () => {
    const result = estimate(simulate({ days: 70, tdee: () => 2500 }));
    expect(result.adaptation?.flagged).toBeNull();
  });

  it("un pesaje disparatado se marca y casi no mueve el gasto", () => {
    const clean = estimate(simulate({ days: 40, tdee: () => 2500 }));
    const spiked = estimate(simulate({ days: 40, tdee: () => 2500, spike: { 30: 3 } }));
    expect(spiked.outliers).toContain(addDays(START, 30));
    expect(Math.abs(spiked.tdee - clean.tdee)).toBeLessThan(60);
  });

  it("aprende cuánta agua retiene la persona por los carbohidratos", () => {
    const result = estimate(
      simulate({ days: 60, tdee: () => 2500, carbs: (day) => (day % 3 === 0 ? 420 : 180), carbEffect: 0.5 }),
    );
    expect(result.effects.carbsPer100g.learned).toBe(true);
    expect(result.effects.carbsPer100g.value).toBeGreaterThan(0.3);
    expect(result.effects.carbsPer100g.value).toBeLessThan(0.7);
    // Sin ciclo anotado, sus efectos se quedan en el valor de partida.
    expect(result.effects.lutealKg.learned).toBe(false);
  });

  it("aprende el ruido de la báscula de cada quien", () => {
    const calm = estimate(simulate({ days: 60, tdee: () => 2500, noise: 0.15 }));
    const noisy = estimate(simulate({ days: 60, tdee: () => 2500, noise: 0.7 }));
    expect(calm.noiseKg).toBeLessThan(0.3);
    expect(noisy.noiseKg).toBeGreaterThan(0.5);
    expect(noisy.tdeeSd).toBeGreaterThan(calm.tdeeSd);
  });

  it("los días incompletos aumentan la incertidumbre en vez de sesgar", () => {
    const full = estimate(simulate({ days: 45, tdee: () => 2500 }));
    const gaps = estimate(simulate({ days: 45, tdee: () => 2500, partial: [20, 24, 28, 32, 36, 40, 43] }));
    expect(gaps.tdeeSd).toBeGreaterThan(full.tdeeSd);
    expect(Math.abs(gaps.tdee - 2500)).toBeLessThan(200);
  });

  it("detecta el día de la semana en que más se come", () => {
    // 2026-03-01 es domingo: el día 6 de cada semana es sábado.
    const result = estimate(
      simulate({ days: 42, tdee: () => 2500, intake: (day) => (day % 7 === 6 ? 3100 : 2150) }),
    );
    expect(result.weekday).toMatchObject({ day: 6 });
    expect(result.weekday?.kcal).toBeGreaterThan(600);
  });

  it("separa el agua de hoy del peso real", () => {
    const records = simulate({ days: 40, tdee: () => 2500, noise: 0.15, spike: { 39: 1.2 } });
    const result = estimate(records);
    expect(result.water?.totalKg).toBeGreaterThan(0.7);
    expect(Math.abs(result.weightKg - (records.at(-2)?.weightKg ?? 0))).toBeLessThan(0.5);
  });

  it("la serie empieza el día en que se activó", () => {
    const result = estimate(simulate({ days: 30, tdee: () => 2500 }));
    expect(result.since).toBe(addDays(START, ENGINE_DAYS - 1));
    expect(result.series).toHaveLength(30 - ENGINE_DAYS + 1);
    expect(result.series[0].date).toBe(result.since);
  });
});

describe("motor de autoajuste: datos inciertos", () => {
  it("los días con calorías estimadas ensanchan la incertidumbre", () => {
    const records = simulate({ days: 45, tdee: () => 2500 });
    const exact = estimate(records);
    const estimated = Object.fromEntries(records.slice(-25).map((record) => [record.date, 0.8]));
    const rough = adaptiveEngine(records, { estimated });
    if (!rough.active) throw new Error("El motor debería estar activo.");
    expect(rough.tdeeSd).toBeGreaterThan(exact.tdeeSd);
  });

  it("tras un cambio de plan, el agua de los primeros días pesa menos en el gasto", () => {
    // Al empezar un plan nuevo la báscula sube 1.2 kg de agua en tres días y se queda ahí.
    const base = simulate({ days: 40, tdee: () => 2500, noise: 0.2, seed: 3 });
    const change = 30;
    const records = base.map((record, index) =>
      index >= change && record.weightKg
        ? { ...record, weightKg: record.weightKg + Math.min(3, index - change + 1) * 0.4 }
        : record,
    );
    const plain = estimate(records);
    const marked = adaptiveEngine(records, { transitions: [addDays(START, change)] });
    if (!marked.active) throw new Error("El motor debería estar activo.");
    // El agua se lee como gasto más bajo; marcando el cambio de plan, el error es menor.
    expect(Math.abs(marked.tdee - 2500)).toBeLessThan(Math.abs(plain.tdee - 2500));
  });
});

describe("proyección de peso", () => {
  it("comiendo lo que gastas el peso se queda; la incertidumbre crece con los días", () => {
    const result = estimate(simulate({ days: 45, tdee: () => 2500 }));
    const week = forecastWeight(result, result.tdee, 7);
    const month = forecastWeight(result, result.tdee, 28);
    expect(week.kg).toBeCloseTo(result.weightKg, 5);
    expect(month.sd).toBeGreaterThan(week.sd);
    const deficit = forecastWeight(result, result.tdee - 550, 14);
    expect(deficit.kg).toBeCloseTo(result.weightKg - 1, 1);
  });
});
