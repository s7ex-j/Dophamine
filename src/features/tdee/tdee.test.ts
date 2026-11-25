import { describe, expect, it, vi } from "vitest";

import * as engine from "@/src/features/tdee/adaptive";
import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { buildNutritionProfile } from "@/src/features/profile/profile";
import {
  analyzeMetabolism,
  simpleAnalysis,
  energyBalance,
  energyPerKg,
  expenditureSeries,
  KCAL_PER_KG_DEFAULT,
  linearTrend,
  rangeText,
  trendPoints,
  weightSlope,
  weeklyRecommendation,
} from "@/src/features/tdee/tdee";

function days(
  count: number,
  record: (index: number) => { weightKg: number | null; caloriesIn: number },
): DailyBiometrics[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10);
    return { id: date, date, proteinG: 0, carbsG: 0, fatsG: 0, ...record(index) };
  });
}

const profile = buildNutritionProfile({
  age: 25,
  sex: "male",
  heightCm: 180,
  weightKg: 75,
  activity: "moderate",
  goal: "maintain",
});

describe("analyzeMetabolism", () => {
  it("no estima el TDEE con menos de 14 días de registros", () => {
    const analysis = analyzeMetabolism(days(13, () => ({ weightKg: 75, caloriesIn: 2500 })));
    expect(analysis.status).toBe("building");
    expect(analysis.tdee).toBeNull();
  });

  it("con peso estable, el TDEE es la ingesta media", () => {
    const analysis = analyzeMetabolism(days(21, () => ({ weightKg: 75, caloriesIn: 2500 })));
    expect(analysis.status).toBe("updating");
    expect(analysis.weeklyRateKg).toBeCloseTo(0);
    expect(analysis.tdee).toBe(2500);
  });

  it("si el peso baja, el gasto estimado supera a la ingesta", () => {
    const analysis = analyzeMetabolism(
      days(28, (index) => ({ weightKg: 80 - index * 0.07, caloriesIn: 2200 })),
    );
    expect(analysis.weeklyRateKg).toBeLessThan(0);
    expect(analysis.tdee).toBeGreaterThan(2200);
  });

  it("ordena los registros por fecha antes de calcular la tendencia", () => {
    const ordered = days(21, (index) => ({ weightKg: 75 + index * 0.05, caloriesIn: 2600 }));
    expect(analyzeMetabolism([...ordered].reverse())).toEqual(analyzeMetabolism(ordered));
  });

  it("pasa a pausa si la última semana tiene pocos registros de ingesta", () => {
    const analysis = analyzeMetabolism(
      days(21, (index) => ({ weightKg: 75, caloriesIn: index < 14 || index === 20 ? 2500 : 0 })),
    );
    expect(analysis.nutritionDaysLast7).toBe(1);
    expect(analysis.status).toBe("holding");
  });
});

describe("weeklyRecommendation", () => {
  it("pide más registros si todavía no hay TDEE", () => {
    const analysis = analyzeMetabolism(days(3, () => ({ weightKg: 75, caloriesIn: 2500 })));
    expect(weeklyRecommendation(analysis, "maintain", 75)).toContain("14 días");
  });

  it("mantiene el plan cuando la tendencia coincide con el objetivo", () => {
    const analysis = analyzeMetabolism(days(21, () => ({ weightKg: 75, caloriesIn: 2500 })));
    expect(weeklyRecommendation(analysis, "maintain", 75)).toContain("Mantén el plan");
  });
});

describe("gasto y balance para el Panel", () => {
  const steady = days(30, () => ({ weightKg: 75, caloriesIn: 2500 }));

  it("da el gasto de cada día desde que hay datos suficientes", () => {
    const series = expenditureSeries(steady, 14);
    expect(series.length).toBeGreaterThan(0);
    expect(series.every((point) => point.tdee === 2500)).toBe(true);
    expect(series.at(-1)?.date).toBe(steady.at(-1)?.date);
    expect(expenditureSeries(days(5, () => ({ weightKg: 75, caloriesIn: 2500 })))).toEqual([]);
  });

  it("calcula el balance de los días con ingesta", () => {
    const balance = energyBalance(
      [...steady.slice(-3), { ...steady[0], date: "2026-03-01", caloriesIn: 0 }],
      2700,
    );
    expect(balance).toHaveLength(3);
    expect(balance.every((day) => day.balance === -200)).toBe(true);
    expect(energyBalance(steady, null)).toEqual([]);
  });
});

describe("precisión del gasto", () => {
  it("ajusta una recta y da su error", () => {
    expect(linearTrend([0, 1, 2, 3], [1, 3, 5, 7])).toEqual({ slope: 2, standardError: 0 });
    expect(linearTrend([0, 1, 2, 3], [1, 2, 4, 3]).standardError).toBeGreaterThan(0);
    expect(linearTrend([0, 1], [1, 2]).slope).toBe(0);
  });

  it("los días incompletos no cuentan para la ingesta media", () => {
    const records = days(21, (index) => ({ weightKg: 75, caloriesIn: index % 7 === 3 ? 900 : 2500 }));
    for (const record of records) if (record.caloriesIn === 900) record.partial = true;
    const analysis = analyzeMetabolism(records);
    expect(analysis.tdee).toBe(2500);
    expect(analysis.partialDays).toBe(3);
    // 18 completos, sin el del último pesaje.
    expect(analysis.loggedDays).toBe(17);
  });

  it("un salto de agua pesa menos en la tendencia", () => {
    const records = days(10, () => ({ weightKg: 75, caloriesIn: 2500 }));
    records.forEach((record) => (record.waterPct = 58));
    records[9] = { ...records[9], weightKg: 76.5, waterPct: 61 };
    const points = trendPoints(records);
    expect(points.at(-1)?.damped).toBe(true);
    expect(points.at(-1)?.trendKg).toBeCloseTo(75.15, 2);
    const plain = trendPoints(days(10, (index) => ({ weightKg: index === 9 ? 75.5 : 75, caloriesIn: 2500 })));
    expect(plain.at(-1)?.damped).toBeUndefined();
  });

  it("usa la energía real del tejido cuando hay composición medida", () => {
    expect(energyPerKg(days(20, () => ({ weightKg: 75, caloriesIn: 2500 })))).toBe(KCAL_PER_KG_DEFAULT);
    // Sube 2 kg y el % de grasa baja: casi todo es masa magra, que aporta pocas kcal por kg.
    const lean = days(20, (index) => ({ weightKg: 70 + index * 0.1, caloriesIn: 2800 }));
    lean.forEach((record, index) => (record.bodyFatPct = 15 - index * 0.05));
    expect(energyPerKg(lean)).toBeLessThan(3000);
    // Baja 2 kg y casi todo es grasa.
    const fat = days(20, (index) => ({ weightKg: 80 - index * 0.1, caloriesIn: 2000 }));
    fat.forEach((record, index) => (record.bodyFatPct = 20 - index * 0.11));
    expect(energyPerKg(fat)).toBeGreaterThan(8500);
  });

  it("da un margen que crece con el ruido del peso", () => {
    const calm = days(21, () => ({ weightKg: 75, caloriesIn: 2500 }));
    const jumpy = days(21, (index) => ({ weightKg: 75 + (index % 2 ? 0.8 : -0.8), caloriesIn: 2500 }));
    const steady = simpleAnalysis(calm);
    const noisy = simpleAnalysis(jumpy);
    // Sin ruido queda solo el 3 % por errores al anotar, igual que en el motor: 1.96 × 75 ≈ 150.
    expect(steady.tdeeMargin).toBe(150);
    expect(noisy.tdeeMargin ?? 0).toBeGreaterThan(steady.tdeeMargin ?? 0);
    // Con 15 días seguidos completos manda el motor de autoajuste, y también ensancha el margen.
    const engine = analyzeMetabolism(calm);
    expect(engine.adaptive?.active).toBe(true);
    expect(engine.tdee).toBeGreaterThan(2440);
    expect(engine.tdee).toBeLessThan(2560);
    expect(analyzeMetabolism(jumpy).tdeeMargin ?? 0).toBeGreaterThan(engine.tdeeMargin ?? 0);
  });

  it("antes de los 15 días seguidos se usa el cálculo simple y se informa el avance", () => {
    const records = days(20, () => ({ weightKg: 75, caloriesIn: 2500 }));
    records[6] = { ...records[6], weightKg: null };
    records[13] = { ...records[13], partial: true };
    const analysis = analyzeMetabolism(records);
    expect(analysis.adaptive).toEqual({ active: false, streak: 6, needed: 15 });
    expect(analysis.tdee).toBe(simpleAnalysis(records).tdee);
  });
});

// Ruido repetible, sin depender del azar de cada corrida.
function noise(seed: number) {
  let state = seed;
  const next = () => (state = (state * 16807) % 2147483647) / 2147483647;
  return () => Math.sqrt(-2 * Math.log(next())) * Math.cos(2 * Math.PI * next());
}
const deviation = (values: number[]) => {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
};

describe("0.42.1: el cálculo simple compara lo mismo con lo mismo", () => {
  const on = (date: string, weightKg: number | null, caloriesIn: number): DailyBiometrics => ({
    id: date,
    date,
    weightKg,
    caloriesIn,
    proteinG: 0,
    carbsG: 0,
    fatsG: 0,
  });

  it("los últimos siete días son del calendario, no los últimos siete registros", () => {
    const steady = days(20, () => ({ weightKg: 75, caloriesIn: 2500 }));
    const spread = ["2026-02-01", "2026-02-08", "2026-02-15"].map((date) => on(date, 75, 2500));
    const analysis = simpleAnalysis([...steady, ...spread]);
    expect(analysis.nutritionDaysLast7).toBe(1);
    expect(analysis.status).toBe("holding");
  });

  it("datos viejos sin nada reciente quedan en pausa", () => {
    const january = days(20, () => ({ weightKg: 75, caloriesIn: 2500 }));
    expect(simpleAnalysis(january, "2026-01-20").status).toBe("updating");
    expect(simpleAnalysis(january, "2026-03-20")).toMatchObject({ status: "holding", nutritionDaysLast7: 0 });
  });

  it("la ingesta sale del mismo periodo que los pesajes", () => {
    const records = days(42, (index) => ({ weightKg: 80, caloriesIn: index < 28 ? 3200 : 2200 }));
    records.forEach((record, index) => index < 28 && (record.weightKg = null));
    // Los 14 días pesados comió 2200 con el peso estable: eso es lo que gasta.
    expect(simpleAnalysis(records).tdee).toBe(2200);
  });

  it("lo comido el día del último pesaje no cuenta todavía", () => {
    const records = days(21, (index) => ({ weightKg: 75, caloriesIn: index === 20 ? 6000 : 2500 }));
    expect(simpleAnalysis(records).tdee).toBe(2500);
  });

  it("con días sin anotar el margen crece, sin cambiar lo estimado", () => {
    const full = days(28, (index) => ({ weightKg: 75, caloriesIn: index % 2 ? 2800 : 2200 }));
    const gaps = full.map((record, index) => ({
      ...record,
      caloriesIn: index % 4 < 2 ? record.caloriesIn : 0,
    }));
    expect(simpleAnalysis(gaps).tdeeMargin ?? 0).toBeGreaterThan(simpleAnalysis(full).tdeeMargin ?? 0);
  });
});

describe("0.42.1: los días de comida que se cuentan son los que entran en el cálculo", () => {
  /** 14 pesajes diarios y comida solo en los días indicados. */
  const ate = (...fed: number[]) =>
    days(16, (index) => ({
      weightKg: index < 14 ? 75 : null,
      caloriesIn: fed.includes(index) ? 2500 : 0,
    }));

  it("con diez días, uno de ellos el del último pesaje, todavía no alcanza", () => {
    const nine = simpleAnalysis(ate(0, 1, 2, 3, 4, 5, 6, 7, 8, 13));
    expect(nine).toMatchObject({ tdee: null, status: "building", loggedDays: 9 });
    const ten = simpleAnalysis(ate(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 13));
    expect(ten.tdee).toBe(2500);
    expect(ten.loggedDays).toBe(10);
  });

  it("la comida posterior al último pesaje no se cuenta", () => {
    expect(simpleAnalysis(ate(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 13, 14, 15)).loggedDays).toBe(10);
  });
});

describe("0.42.1: el margen contiene el gasto verdadero", () => {
  type Case = {
    days: number;
    intake: number;
    noise: number;
    /** Cuánto del ruido del peso sigue al día siguiente (agua). */
    carry?: number;
    skipWeigh?: number;
    skipMeals?: number;
    fatNoise?: number;
    /** Energía real de cada kilo, si no es la supuesta. */
    density?: number;
    /** Cuánto del cambio es grasa (con báscula de grasa) y cuánto de su error sigue al día siguiente. */
    fatShare?: number;
    fatCarry?: number;
    /** El plan empezó con los datos. */
    early?: boolean;
    /** Error de registro propio de cada persona (proporción). El margen cuenta con un 3 %. */
    bias?: number;
  };
  const TRUE = 2500;

  function coverage(setup: Case, runs = 400) {
    const gauss = noise(4242);
    let state = 99;
    const chance = () => (state = (state * 16807) % 2147483647) / 2147483647;
    const errors: number[] = [];
    const margins: number[] = [];
    let inside = 0;
    let inRange = 0;
    let rangeWidth = 0;
    for (let run = 0; run < runs; run += 1) {
      let weight = 80;
      let water = 0;
      let scale = 0;
      const bias = (setup.bias ?? 0.03) * gauss();
      const records = days(setup.days, () => ({ weightKg: null, caloriesIn: 0 }));
      for (const record of records) {
        const eaten = setup.intake + 250 * gauss();
        water = (setup.carry ?? 0) * water + setup.noise * gauss();
        record.weightKg = chance() < (setup.skipWeigh ?? 0) ? null : Math.round((weight + water) * 10) / 10;
        record.caloriesIn = chance() < (setup.skipMeals ?? 0) ? 0 : Math.round(eaten * (1 + bias));
        // Con báscula de grasa, lo que cambia es solo grasa (9400 kcal/kg).
        if (setup.fatNoise) {
          scale = (setup.fatCarry ?? 0) * scale + setup.fatNoise * gauss();
          record.bodyFatPct = ((16 - (setup.fatShare ?? 1) * (80 - weight)) / weight) * 100 + scale;
        }
        weight +=
          (eaten - TRUE) / (setup.density ?? (setup.fatNoise ? 1800 + 7600 * (setup.fatShare ?? 1) : 7700));
      }
      const { tdee, tdeeMargin, tdeeRange } = simpleAnalysis(
        records,
        undefined,
        setup.early ? records[0].date : undefined,
      );
      if (tdee === null || tdeeMargin === null || tdeeRange === null) continue;
      if (TRUE >= tdeeRange.low && TRUE <= tdeeRange.high) inRange += 1;
      rangeWidth += (tdeeRange.high - tdeeRange.low) / 2;
      errors.push(tdee - TRUE);
      margins.push(tdeeMargin);
      if (Math.abs(tdee - TRUE) <= tdeeMargin) inside += 1;
    }
    const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    return {
      runs: errors.length,
      covered: inside / errors.length,
      inRange: inRange / errors.length,
      rangeHalf: rangeWidth / errors.length,
      marginHalf: mean(margins),
      bias: mean(errors),
      // Cuántas veces el margen que haría falta (1.96 errores típicos): cubrir solo por ancho no vale.
      width: mean(margins) / (1.96 * Math.sqrt(mean(errors.map((error) => error ** 2)))),
    };
  }

  const cases: Array<[string, Case, number?]> = [
    ["peso estable, 28 días", { days: 28, intake: 2500, noise: 0.4 }],
    ["definición, 21 días", { days: 21, intake: 2000, noise: 0.4 }],
    ["definición, 42 días", { days: 42, intake: 2000, noise: 0.4 }],
    ["volumen, 42 días", { days: 42, intake: 2800, noise: 0.4 }],
    ["se pesa 4 de cada 10 días", { days: 42, intake: 2000, noise: 0.4, skipWeigh: 0.6 }],
    ["anota 6 de cada 10 días", { days: 42, intake: 2000, noise: 0.4, skipMeals: 0.4 }],
    ["agua que dura varios días", { days: 42, intake: 2100, noise: 0.3, carry: 0.7 }],
    // Límites conocidos: el margen da por buena la energía por kilo. Si lo que cambia no es lo supuesto
    // (aquí, grasa pura), cubre menos. Se miden para que no empeoren y para no prometer de más.
    ["límite: báscula de grasa con ±1 punto", { days: 42, intake: 2000, noise: 0.4, fatNoise: 1 }, 0.85],
    ["límite: solo grasa y sin báscula", { days: 42, intake: 2000, noise: 0.4, density: 9400 }, 0.75],
    ["anota sin error propio", { days: 42, intake: 2000, noise: 0.4, bias: 0 }],
  ];
  it.each(cases)("%s", (_name, setup, atLeast = 0.92) => {
    const result = coverage(setup);
    expect(result.runs).toBeGreaterThan(250);
    expect(result.covered).toBeGreaterThanOrEqual(atLeast);
    expect(result.width).toBeLessThan(1.8);
  });

  const cut = { days: 42, intake: 2000, noise: 0.4 };
  const bia = { ...cut, fatNoise: 1 };
  const ranged: Array<[string, Case]> = [
    ["peso estable", { ...cut, intake: 2500 }],
    ["7700", cut],
    ["5900", { ...cut, density: 5900 }],
    ["6000", { ...cut, density: 6000 }],
    ["solo grasa", { ...cut, density: 9400 }],
    ["volumen a 5900", { ...cut, intake: 2800, density: 5900 }],
    ["báscula ruidosa, solo grasa", bia],
    ["báscula ruidosa, 60 % grasa", { ...bia, fatShare: 0.6 }],
    ["báscula buena, solo grasa", { ...bia, fatNoise: 0.3 }],
    ["báscula buena, 60 % grasa", { ...bia, fatNoise: 0.3, fatShare: 0.6 }],
    ["báscula que se desvía varios días", { ...bia, fatNoise: 0.4, fatCarry: 0.7, fatShare: 0.8 }],
    ["primeras semanas a 4850", { ...cut, days: 35, density: 4850, early: true }],
  ];
  // Describe estas simulaciones; no es una garantía para cualquier persona.
  it.each(ranged)("el rango contiene el gasto simulado: %s", (_name, setup) => {
    const result = coverage(setup);
    expect(result.runs).toBeGreaterThan(250);
    expect(result.inRange).toBeGreaterThanOrEqual(0.94);
  });

  it("con el peso estable el rango casi no se ensancha; en déficit, sí", () => {
    const steady = coverage({ ...cut, intake: 2500 });
    expect(steady.rangeHalf / steady.marginHalf).toBeLessThan(1.15);
    const deficit = coverage(cut);
    expect(deficit.rangeHalf / deficit.marginHalf).toBeGreaterThan(1.4);
    expect(deficit.rangeHalf / deficit.marginHalf).toBeLessThan(2.2);
  });

  it("límite: fuera de los extremos no cubre (4900 sin saber que son las primeras semanas)", () => {
    expect(coverage({ ...cut, density: 4900 }).inRange).toBeLessThan(0.9);
  });
});

describe("0.42.1: el rango de sensibilidad", () => {
  const losing = (count: number) =>
    days(count, (index) => ({ weightKg: 80 - index * 0.07, caloriesIn: 2000 }));

  it("es el gasto en los dos extremos, contiene el margen y no cambia el gasto", () => {
    const { tdee, tdeeMargin, tdeeRange } = simpleAnalysis(losing(30));
    expect(tdee).toBe(2539);
    expect(tdeeRange?.kcalPerKg).toEqual({ low: 5900, high: 9400 });
    // 2000 + 0.07 × 5900 y × 9400, menos y más su margen.
    expect(tdeeRange?.low).toBeLessThanOrEqual(2413 - (tdeeMargin ?? 0) + 10);
    expect(tdeeRange?.high).toBeGreaterThanOrEqual(2658 + (tdeeMargin ?? 0) - 10);
  });

  it("sin datos suficientes no hay rango", () => {
    expect(simpleAnalysis(losing(8)).tdeeRange).toBeNull();
  });

  it("el escenario temprano se suma solo en las primeras seis semanas del plan", () => {
    const low = (start?: string) => simpleAnalysis(losing(30), "2026-01-30", start).tdeeRange?.kcalPerKg.low;
    expect(low()).toBe(5900);
    expect(low("2026-01-01")).toBe(4850);
    expect(low("2025-12-20")).toBe(4850);
    expect(low("2025-12-19")).toBe(5900);
    // Un plan que empieza mañana no cuenta como reciente; el que empieza hoy, sí.
    expect(low("2026-01-31")).toBe(5900);
    expect(low("2026-01-30")).toBe(4850);
  });

  it("la báscula de grasa no lo estrecha, sea buena o imposible", () => {
    for (const pct of [(kg: number) => ((kg - 64) / kg) * 100, (kg: number) => 20 + (80 - kg) * 1.4]) {
      const records = losing(40);
      records.forEach((record) => (record.bodyFatPct = pct(record.weightKg as number)));
      expect(simpleAnalysis(records).tdeeRange?.kcalPerKg).toEqual({ low: 5900, high: 9400 });
    }
  });

  it("si se usa un valor más bajo que los escenarios, también entra", () => {
    const records = losing(40);
    // Solo se pierde músculo y agua: la grasa en kg no cambia.
    records.forEach((record) => (record.bodyFatPct = (16 / (record.weightKg as number)) * 100));
    const { energyPerKg: used, tdeeRange } = simpleAnalysis(records);
    expect(used).toBeLessThan(5900);
    expect(tdeeRange?.kcalPerKg).toEqual({ low: used, high: 9400 });
  });

  it("contiene el gasto y su margen de cualquier valor intermedio; más allá de los extremos, no siempre", () => {
    const gauss = noise(8);
    const records = losing(30);
    records.forEach((record) => (record.weightKg = (record.weightKg as number) + 0.4 * gauss()));
    const { tdeeAt, tdeeRange } = simpleAnalysis(records);
    for (let density = 5900; density <= 9400; density += 250) {
      expect(tdeeAt?.(density)).toBeGreaterThan(tdeeRange?.low ?? Infinity);
      expect(tdeeAt?.(density)).toBeLessThan(tdeeRange?.high ?? 0);
    }
    expect(tdeeAt?.(2000)).toBeLessThan(tdeeRange?.low ?? 0);
  });

  it("el margen se recalcula en cada escenario, no se traslada", () => {
    const gauss = noise(8);
    const records = losing(30);
    records.forEach((record) => (record.weightKg = (record.weightKg as number) + 0.8 * gauss()));
    const { tdeeAt, tdeeRange, tdeeMargin } = simpleAnalysis(records);
    const at = (density: number) => tdeeAt?.(density) ?? 0;
    expect(at(5900) - (tdeeRange?.low ?? 0)).toBeLessThan((tdeeMargin ?? 0) - 20);
    expect((tdeeRange?.high ?? 0) - at(9400)).toBeGreaterThan((tdeeMargin ?? 0) + 20);
  });

  // Describe estas simulaciones; no es una garantía para cualquier persona.
  it.each([
    [4850, true],
    [5900, false],
    [6000, false],
    [6800, false],
    [7700, false],
    [8500, false],
    [9400, false],
  ])(
    "con el motor activo el rango contiene el gasto simulado a %i kcal/kg",
    (density, early) => {
      const gauss = noise(5);
      let inRange = 0;
      for (let run = 0; run < 40; run += 1) {
        let weight = 80;
        const records = days(40, () => ({ weightKg: 0, caloriesIn: 0 }));
        for (const record of records) {
          record.caloriesIn = Math.round(2000 + 250 * gauss());
          record.weightKg = weight + 0.4 * gauss();
          weight += (record.caloriesIn - 2500) / density;
        }
        const { adaptive, tdeeRange } = analyzeMetabolism(records, {
          planStart: early ? records[0].date : undefined,
        });
        expect(adaptive?.active).toBe(true);
        if (tdeeRange && tdeeRange.low <= 2500 && tdeeRange.high >= 2500) inRange += 1;
      }
      expect(inRange).toBeGreaterThanOrEqual(37);
    },
    30_000,
  );

  it("el motor se corre en cada escenario, también los intermedios, y no cambia el gasto", () => {
    const gauss = noise(3);
    let weight = 80;
    const records = days(40, () => ({ weightKg: 0, caloriesIn: 0 }));
    for (const record of records) {
      record.caloriesIn = Math.round(2000 + 200 * gauss());
      record.weightKg = weight + 0.3 * gauss();
      // Báscula buena: el valor usado no es 7700, que queda como un escenario intermedio más.
      record.bodyFatPct = ((16 - (80 - weight)) / weight) * 100 + 0.1 * gauss();
      weight += (record.caloriesIn - 2500) / 9400;
    }
    const spy = vi.spyOn(engine, "adaptiveEngine");
    const result = analyzeMetabolism(records, { planStart: records[0].date });
    const runs = spy.mock.calls.map(([, options]) => options?.energyPerKg ?? 0);
    spy.mockRestore();
    expect(result.energyPerKg).not.toBe(7700);
    expect([...runs].sort((a, b) => a - b)).toEqual(
      [4850, 5900, 7700, result.energyPerKg, 9400].sort((a, b) => a - b),
    );
    if (!result.adaptive?.active) throw new Error("motor inactivo");
    const { driftKcal: drift } = result.adaptive;
    const ends = runs.flatMap((density) => {
      const priorTdee = simpleAnalysis(records).tdeeAt?.(density);
      const run = engine.adaptiveEngine(records, { energyPerKg: density, priorTdee, drift });
      return run.active ? [run.tdee - 1.96 * run.totalSd, run.tdee + 1.96 * run.totalSd] : [];
    });
    expect(ends).toHaveLength(10);
    expect(result.tdeeRange?.low).toBe(Math.floor(Math.min(...ends) / 10) * 10);
    expect(result.tdeeRange?.high).toBe(Math.ceil(Math.max(...ends) / 10) * 10);
    expect(analyzeMetabolism(records, { range: false }).tdee).toBe(result.tdee);
  });

  it("el texto dice kcal/kg en los escenarios", () => {
    const { tdeeRange } = simpleAnalysis(losing(30));
    expect(tdeeRange && rangeText(tdeeRange)).toContain("de 5900 a 9400 kcal/kg");
  });
});

describe("0.42.1: el ritmo del peso y su error", () => {
  const line = (days: number[], slope: number, jitter: () => number) =>
    trendPoints(
      days.map((day) => {
        const date = new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10);
        return {
          id: date,
          date,
          weightKg: 80 + slope * day + jitter(),
          caloriesIn: 2500,
          proteinG: 0,
          carbsG: 0,
          fatsG: 0,
        };
      }),
    );
  const daily = Array.from({ length: 42 }, (_, index) => index);

  it("sin ruido recupera la pendiente exacta, también con pesajes salteados", () => {
    for (const dates of [daily, [0, 1, 2, 5, 9, 10, 16, 21, 22, 23, 30, 35, 41]])
      expect(weightSlope(line(dates, -0.07, () => 0)).slope).toBeCloseTo(-0.07, 6);
  });

  for (const [name, dates] of [
    ["a diario", daily],
    ["14 días", daily.slice(0, 14)],
    ["cada tres días", daily.filter((day) => day % 3 === 0)],
  ] as const)
    it(`el error declarado se parece al real pesándose ${name}`, () => {
      const jitter = noise(7);
      const fits = Array.from({ length: 400 }, () =>
        weightSlope(line([...dates], -0.05, () => 0.5 * jitter())),
      );
      const real = deviation(fits.map((fit) => fit.slope));
      const declared = fits.reduce((sum, fit) => sum + fit.standardError, 0) / fits.length;
      // Antes era 4.7 veces menor que el real.
      expect(declared / real).toBeGreaterThan(0.85);
      expect(declared / real).toBeLessThan(1.6);
    });

  it("si el agua dura varios días, el error se ensancha", () => {
    const jitter = noise(11);
    let wave = 0;
    const fits = Array.from({ length: 300 }, () =>
      weightSlope(line(daily, 0, () => (wave = 0.6 * wave + 0.3 * jitter()))),
    );
    const declared = fits.reduce((sum, fit) => sum + fit.standardError, 0) / fits.length;
    expect(declared / deviation(fits.map((fit) => fit.slope))).toBeGreaterThan(0.7);
  });

  it("tras varios días sin pesarse la tendencia se acerca más al pesaje nuevo", () => {
    const after = (day: number) =>
      line([0, day], 0, () => 0).length &&
      trendPoints([
        { id: "a", date: "2026-01-01", weightKg: 80, caloriesIn: 0, proteinG: 0, carbsG: 0, fatsG: 0 },
        {
          id: "b",
          date: `2026-01-${String(1 + day).padStart(2, "0")}`,
          weightKg: 80.9,
          caloriesIn: 0,
          proteinG: 0,
          carbsG: 0,
          fatsG: 0,
        },
      ])[1].trendKg;
    expect(after(1)).toBeCloseTo(80.252, 3);
    expect(after(10)).toBeGreaterThan(80.8);
  });
});

describe("0.42.1: composición que no es posible o trae mucho ruido", () => {
  it("si el peso baja y la grasa sube, se usa 7700", () => {
    const records = days(30, (index) => ({ weightKg: 80 - index * 0.07, caloriesIn: 2000 }));
    records.forEach((record, index) => (record.bodyFatPct = 20 + index * 0.1));
    expect(energyPerKg(records)).toBe(KCAL_PER_KG_DEFAULT);
  });

  it("con una balanza ruidosa se queda cerca de lo real y nunca en un extremo", () => {
    const jitter = noise(5);
    const values = Array.from({ length: 200 }, () => {
      const records = days(30, (index) => ({
        weightKg: 80 - index * 0.07 + 0.4 * jitter(),
        caloriesIn: 2000,
      }));
      // Se pierde solo grasa (9400 kcal/kg), leída con ±1 punto.
      records.forEach((record, index) => {
        record.bodyFatPct = ((16 - index * 0.07) / (80 - index * 0.07)) * 100 + jitter();
      });
      return energyPerKg(records);
    }).sort((a, b) => a - b);
    expect(values[10]).toBeGreaterThan(6500);
    expect(values[100]).toBeGreaterThan(7700);
  });
});
