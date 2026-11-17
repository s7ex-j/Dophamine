import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { countsForIntake } from "@/src/features/biometrics/dailyLog";
import { cycleStatus, type Period, type Phase } from "@/src/features/period/period";
import { addDays } from "@/src/lib/dates";

/**
 * Motor de autoajuste. Se activa cuando hay 15 días seguidos con peso y comida
 * completos y desde ahí reemplaza al cálculo simple del gasto.
 *
 * Es un filtro de Kalman sobre un estado oculto de seis valores:
 *
 *   peso real · gasto diario · agua por carbohidratos · peso de la comida de
 *   ayer · agua en fase lútea · agua en la menstruación
 *
 * Cada día el peso real avanza según lo comido menos el gasto, y el gasto puede
 * derivar un poco. La báscula no mide el peso real: mide peso real + agua +
 * ruido. Los cuatro efectos de agua se aprenden de la persona junto con lo demás.
 *
 * Lo que el motor ajusta solo:
 * - El ruido de la báscula (cuánto varía el peso de un día a otro sin motivo).
 * - Cuánto puede moverse el gasto de un día al otro: se prueban varias derivas
 *   y se queda la que mejor predice los pesajes (máxima verosimilitud).
 * - Los pesajes atípicos pesan menos (pérdida de Huber) y los días sin comida
 *   completa aumentan la incertidumbre en lugar de inventar un dato.
 *
 * Un suavizador (Rauch-Tung-Striebel) recorre después la historia hacia atrás
 * para ver el pasado con lo que se supo después: con eso se mide el ritmo real
 * y si el gasto bajó más de lo que explica el cambio de peso (adaptación).
 *
 * Módulo puro. Lo visible es simple; la complejidad queda aquí.
 */
export const ENGINE_DAYS = 15;
const WINDOW_DAYS = 120;

// Posiciones del estado.
const W = 0;
const D = 1;
const B_CARB = 2;
const B_FOOD = 3;
const B_LUTEAL = 4;
const B_MENSES = 5;
const N = 6;

// Valores de partida (media y desviación) de lo que aún no se aprendió.
const PRIOR_MEAN = [0, 0, 0.25, 0.25, 0.4, 0.2];
const PRIOR_SD = [0.6, 0, 0.25, 0.25, 0.5, 0.5];
const PRIOR_TDEE_SD = 300;
/** Derivas del gasto que se prueban, en kcal por día. */
const DRIFTS = [2, 5, 10, 18, 30, 45];
const DRIFT_TYPICAL = 15;
/** Cambio de peso real no explicado por la energía, en kg por día. */
const DRIFT_WEIGHT = 0.02;
/** Error al anotar la comida de un día completo. */
const LOGGING_ERROR = 0.05;
const NOISE_START = 0.4;
const NOISE_MIN = 0.12;
const NOISE_MAX = 1;
const NOISE_LEARNING = 0.1;
const HUBER = 2.5;
const OUTLIER = 3.5;
/** kcal de gasto que cambian por cada kg de peso (para medir la adaptación). */
const KCAL_PER_KG_BODY = 22;
/** La adaptación se mide contra el gasto de hace 4 a 8 semanas. */
const ADAPTATION_MIN_DAYS = 28;
const ADAPTATION_MAX_DAYS = 56;

type Matrix = number[][];
type Day = {
  date: string;
  weight: number | null;
  intake: number | null;
  carbs: number | null;
  phase: Phase | null;
};
type Step = { xPred: number[]; pPred: Matrix; x: number[]; p: Matrix };
type Base = { intake: number; intakeSd: number; carbs: number };

export type AdaptiveOptions = {
  /** kcal por kg de cambio de peso (7700 si no se indica). */
  energyPerKg?: number;
  /** Punto de partida del gasto: el cálculo simple o el de la evaluación inicial. */
  priorTdee?: number | null;
  periods?: Period[];
};
export type Learned = { value: number; sd: number; learned: boolean };
export type AdaptiveProgress = { active: false; streak: number; needed: number };
export type AdaptiveEstimate = {
  active: true;
  streak: number;
  needed: number;
  /** Día en que se juntaron los 15 seguidos. */
  since: string;
  days: number;
  tdee: number;
  tdeeSd: number;
  /** Margen (±) ya con el error típico al anotar la comida. */
  margin: number;
  weightKg: number;
  weightSd: number;
  weeklyRateKg: number;
  /** Lo que la báscula marcó hoy por encima (o debajo) del peso real, y de dónde sale. */
  water: { totalKg: number; carbsKg: number; foodKg: number; cycleKg: number } | null;
  /** Variación diaria del peso sin motivo, en kg (aprendida). */
  noiseKg: number;
  /** Deriva diaria del gasto elegida, en kcal. */
  driftKcal: number;
  effects: { carbsPer100g: Learned; foodPer1000kcal: Learned; lutealKg: Learned; mensesKg: Learned };
  /** Cambio del gasto en las últimas `weeks` semanas (4 a 8) que el peso no explica. */
  adaptation: { kcal: number; sd: number; weeks: number; flagged: "down" | "up" | null } | null;
  /** Día de la semana (0 = domingo) en que más se aparta lo comido del promedio. */
  weekday: { day: number; kcal: number } | null;
  confidence: "high" | "medium" | "low";
  outliers: string[];
  series: Array<{ date: string; tdee: number; weightKg: number }>;
  /** Lo necesario para proyectar el peso con `forecastWeight`. */
  model: { energyPerKg: number; d: number; pWW: number; pWD: number; pDD: number };
};
export type Adaptive = AdaptiveProgress | AdaptiveEstimate;

const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const deviation = (values: number[]) => {
  const center = mean(values);
  return values.length > 1
    ? Math.sqrt(values.reduce((sum, value) => sum + (value - center) ** 2, 0) / (values.length - 1))
    : 0;
};
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const dot = (a: number[], b: number[]) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const zeros = (): Matrix => Array.from({ length: N }, () => new Array<number>(N).fill(0));
const identity = (): Matrix => {
  const matrix = zeros();
  for (let i = 0; i < N; i++) matrix[i][i] = 1;
  return matrix;
};
const transpose = (a: Matrix): Matrix => a.map((_, i) => a.map((row) => row[i]));
const multiply = (a: Matrix, b: Matrix): Matrix =>
  a.map((row) => b[0].map((_, j) => row.reduce((sum, value, k) => sum + value * b[k][j], 0)));
const symmetric = (a: Matrix): Matrix => a.map((row, i) => row.map((value, j) => (value + a[j][i]) / 2));

/** Inversa por Gauss-Jordan con pivoteo parcial; null si la matriz no se puede invertir. */
function invert(matrix: Matrix): Matrix | null {
  const unit = identity();
  const a = matrix.map((row, i) => [...row, ...unit[i]]);
  for (let column = 0; column < N; column++) {
    let pivot = column;
    for (let row = column + 1; row < N; row++)
      if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) pivot = row;
    if (Math.abs(a[pivot][column]) < 1e-14) return null;
    [a[column], a[pivot]] = [a[pivot], a[column]];
    const scale = a[column][column];
    a[column] = a[column].map((value) => value / scale);
    for (let row = 0; row < N; row++) {
      if (row === column) continue;
      const factor = a[row][column];
      if (factor) a[row] = a[row].map((value, index) => value - factor * a[column][index]);
    }
  }
  return a.map((row) => row.slice(N));
}

/** Un renglón por día de calendario, desde el primer pesaje de la ventana. */
function calendar(records: DailyBiometrics[], periods: Period[]): Day[] {
  const ordered = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const last = ordered.at(-1)?.date;
  if (!last) return [];
  const from = addDays(last, -(WINDOW_DAYS - 1));
  const first = ordered.find((record) => record.date >= from && (record.weightKg ?? 0) > 0)?.date;
  if (!first) return [];
  const byDate = new Map(ordered.map((record) => [record.date, record]));
  const days: Day[] = [];
  for (let date = first; date <= last; date = addDays(date, 1)) {
    const record = byDate.get(date);
    const counts = record ? countsForIntake(record) : false;
    days.push({
      date,
      weight: record && (record.weightKg ?? 0) > 0 ? (record.weightKg as number) : null,
      intake: record && counts ? record.caloriesIn : null,
      carbs: record && counts ? record.carbsG : null,
      phase: periods.length ? (cycleStatus(periods, date)?.phase ?? null) : null,
    });
  }
  return days;
}

const complete = (day: Day) => day.weight !== null && day.intake !== null;

/** Dónde se juntaron por primera vez los 15 días seguidos y cuántos van ahora. */
function gateOf(days: Day[]): { index: number | null; streak: number } {
  let run = 0;
  let index: number | null = null;
  days.forEach((day, position) => {
    run = complete(day) ? run + 1 : 0;
    if (index === null && run >= ENGINE_DAYS) index = position;
  });
  // El día de hoy puede estar a medias: no rompe la racha hasta mañana.
  if (run === 0 && days.length > 1) {
    for (let position = days.length - 2; position >= 0 && complete(days[position]); position--) run += 1;
  }
  return { index, streak: run };
}

/** Qué parte del pesaje de un día es agua esperable: carbohidratos y comida de ayer, y fase del ciclo. */
function observation(day: Day, previous: Day | null, base: Base): number[] {
  const known = previous !== null && previous.intake !== null;
  return [
    1,
    0,
    known ? ((previous.carbs ?? base.carbs) - base.carbs) / 100 : 0,
    known ? ((previous.intake as number) - base.intake) / 1000 : 0,
    day.phase === "luteal" ? 1 : 0,
    day.phase === "menstrual" ? 1 : 0,
  ];
}

const huberLoss = (z: number) =>
  Math.abs(z) <= HUBER ? (z * z) / 2 : HUBER * Math.abs(z) - (HUBER * HUBER) / 2;

function runFilter(
  days: Day[],
  rho: number,
  priorTdee: number,
  driftKcal: number,
  base: Base,
  noiseStart = NOISE_START,
) {
  const transition = identity();
  transition[W][D] = -1;
  const transitionT = transpose(transition);
  let x = [...PRIOR_MEAN];
  x[W] = days[0].weight as number;
  x[D] = priorTdee / rho;
  let p = zeros();
  PRIOR_SD.forEach((sd, index) => (p[index][index] = sd * sd));
  p[D][D] = (PRIOR_TDEE_SD / rho) ** 2;
  let noise = noiseStart ** 2;
  let logLikelihood = 0;
  const steps: Step[] = [];
  const outliers: string[] = [];

  days.forEach((day, position) => {
    const previous = position > 0 ? days[position - 1] : null;
    let xPred = x;
    let pPred = p;
    if (previous) {
      const known = previous.intake !== null;
      const intake = known ? (previous.intake as number) : base.intake;
      const intakeSd = known ? LOGGING_ERROR * intake : base.intakeSd;
      xPred = [...x];
      xPred[W] += intake / rho - x[D];
      pPred = multiply(multiply(transition, p), transitionT);
      pPred[W][W] += (intakeSd / rho) ** 2 + DRIFT_WEIGHT ** 2;
      pPred[D][D] += (driftKcal / rho) ** 2;
      for (let index = B_CARB; index < N; index++) pPred[index][index] += 1e-6;
    }
    x = xPred;
    p = pPred;
    if (day.weight !== null) {
      const h = observation(day, previous, base);
      const ph = p.map((row) => dot(row, h));
      const hph = dot(h, ph);
      const dayNoise = noise * (previous && previous.intake === null ? 1.5 : 1);
      const innovation = day.weight - dot(h, x);
      const expected = hph + dayNoise;
      const z = innovation / Math.sqrt(expected);
      // Pesaje atípico: se ensancha su ruido hasta dejarlo en el límite.
      const used = Math.abs(z) > HUBER ? (innovation * innovation) / (HUBER * HUBER) : expected;
      const gain = ph.map((value) => value / used);
      x = x.map((value, index) => value + gain[index] * innovation);
      const keep = identity();
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) keep[i][j] -= gain[i] * h[j];
      const updated = multiply(multiply(keep, p), transpose(keep));
      for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++) updated[i][j] += gain[i] * gain[j] * (used - hph);
      p = symmetric(updated);
      logLikelihood += -0.5 * Math.log(2 * Math.PI * expected) - huberLoss(z);
      if (Math.abs(z) > OUTLIER && position > 0) outliers.push(day.date);
      // El ruido de la báscula se aprende de lo que queda sin explicar.
      const residual = Math.min(Math.abs(day.weight - dot(h, x)), HUBER * Math.sqrt(expected));
      const left = dot(
        h,
        p.map((row) => dot(row, h)),
      );
      noise = clamp(
        (1 - NOISE_LEARNING) * noise + NOISE_LEARNING * (residual * residual + left),
        NOISE_MIN ** 2,
        NOISE_MAX ** 2,
      );
    }
    steps.push({ xPred, pPred, x, p });
  });
  return { steps, logLikelihood, noise, outliers, transitionT };
}

/** Suavizador hacia atrás: el estado de cada día con lo que se supo después. */
function smooth(steps: Step[], transitionT: Matrix): Array<{ x: number[]; p: Matrix }> {
  const result: Array<{ x: number[]; p: Matrix }> = steps.map((step) => ({ x: step.x, p: step.p }));
  for (let position = steps.length - 2; position >= 0; position--) {
    const next = steps[position + 1];
    const inverse = invert(next.pPred);
    if (!inverse) continue;
    const gain = multiply(multiply(steps[position].p, transitionT), inverse);
    const ahead = result[position + 1];
    const shift = ahead.x.map((value, index) => value - next.xPred[index]);
    const spread = ahead.p.map((row, i) => row.map((value, j) => value - next.pPred[i][j]));
    result[position] = {
      x: steps[position].x.map((value, index) => value + dot(gain[index], shift)),
      p: symmetric(
        multiply(multiply(gain, spread), transpose(gain)).map((row, i) =>
          row.map((value, j) => value + steps[position].p[i][j]),
        ),
      ),
    };
  }
  return result;
}

const weekdayOf = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
};

/** El día de la semana en que lo comido más se aparta del promedio, si es claro. */
function weekdayPattern(days: Day[], average: number): AdaptiveEstimate["weekday"] {
  const byDay = new Map<number, number[]>();
  for (const day of days) {
    if (day.intake === null) continue;
    const weekday = weekdayOf(day.date);
    byDay.set(weekday, [...(byDay.get(weekday) ?? []), day.intake]);
  }
  let best: AdaptiveEstimate["weekday"] = null;
  for (const [day, values] of byDay) {
    if (values.length < 2) continue;
    const kcal = Math.round(mean(values) - average);
    if (Math.abs(kcal) >= Math.max(150, 0.08 * average) && (!best || Math.abs(kcal) > Math.abs(best.kcal)))
      best = { day, kcal };
  }
  return best;
}

export function adaptiveEngine(records: DailyBiometrics[], options: AdaptiveOptions = {}): Adaptive {
  const days = calendar(records, options.periods ?? []);
  const gate = gateOf(days);
  if (gate.index === null) return { active: false, streak: gate.streak, needed: ENGINE_DAYS };
  const gateIndex = gate.index;

  const rho = options.energyPerKg && options.energyPerKg > 0 ? options.energyPerKg : 7700;
  const intakes = days.flatMap((day) => (day.intake === null ? [] : [day.intake]));
  const base: Base = {
    intake: mean(intakes),
    intakeSd: Math.max(300, deviation(intakes)),
    carbs: mean(days.flatMap((day) => (day.carbs === null ? [] : [day.carbs]))),
  };
  const priorTdee = options.priorTdee && options.priorTdee > 0 ? options.priorTdee : base.intake;

  // Se elige la deriva del gasto que mejor predice los pesajes de esta persona.
  // Cada deriva se corre dos veces: la primera aprende el ruido de la báscula y la
  // segunda parte ya de ese ruido, para no arrastrar el valor genérico del inicio.
  const tuned = (drift: number) => {
    const first = runFilter(days, rho, priorTdee, drift, base);
    const run = runFilter(days, rho, priorTdee, drift, base, Math.sqrt(first.noise));
    return { ...run, drift, score: run.logLikelihood - 0.5 * Math.log(drift / DRIFT_TYPICAL) ** 2 };
  };
  let chosen = tuned(DRIFTS[0]);
  for (const drift of DRIFTS.slice(1)) {
    const run = tuned(drift);
    if (run.score > chosen.score) chosen = run;
  }
  const smoothed = smooth(chosen.steps, chosen.transitionT);
  const lastIndex = days.length - 1;
  const final = chosen.steps[lastIndex];
  const tdee = final.x[D] * rho;
  const tdeeSd = Math.sqrt(Math.max(0, final.p[D][D])) * rho;

  const back = Math.min(14, lastIndex);
  const weeklyRateKg = back ? ((smoothed[lastIndex].x[W] - smoothed[lastIndex - back].x[W]) / back) * 7 : 0;

  // Agua de hoy: lo que marcó la báscula frente al peso real, con sus causas.
  const lastDay = days[lastIndex];
  let water: AdaptiveEstimate["water"] = null;
  if (lastDay.weight !== null) {
    const h = observation(lastDay, lastIndex ? days[lastIndex - 1] : null, base);
    water = {
      totalKg: lastDay.weight - final.x[W],
      carbsKg: h[B_CARB] * final.x[B_CARB],
      foodKg: h[B_FOOD] * final.x[B_FOOD],
      cycleKg: h[B_LUTEAL] * final.x[B_LUTEAL] + h[B_MENSES] * final.x[B_MENSES],
    };
  }

  const learned = (index: number): Learned => {
    const sd = Math.sqrt(Math.max(0, final.p[index][index]));
    return { value: final.x[index], sd, learned: sd < 0.7 * PRIOR_SD[index] };
  };

  let adaptation: AdaptiveEstimate["adaptation"] = null;
  if (lastIndex >= ADAPTATION_MIN_DAYS) {
    const span = Math.min(lastIndex, ADAPTATION_MAX_DAYS);
    const then = smoothed[lastIndex - span];
    const now = smoothed[lastIndex];
    const change = (now.x[D] - then.x[D]) * rho;
    const explained = KCAL_PER_KG_BODY * (now.x[W] - then.x[W]);
    const sd = Math.sqrt(Math.max(0, now.p[D][D]) + Math.max(0, then.p[D][D])) * rho;
    const kcal = Math.round(change - explained);
    // Una subida se avisa solo si es muy clara: al perder peso el gasto esperado ya baja.
    const limit = Math.max(80, 1.5 * sd);
    const limitUp = Math.max(150, 2 * sd);
    adaptation = {
      kcal,
      sd: Math.round(sd),
      weeks: Math.round(span / 7),
      flagged: kcal < -limit ? "down" : kcal > limitUp ? "up" : null,
    };
  }

  return {
    active: true,
    streak: gate.streak,
    needed: ENGINE_DAYS,
    since: days[gateIndex].date,
    days: days.length,
    tdee,
    tdeeSd,
    margin: Math.round((1.96 * Math.sqrt(tdeeSd ** 2 + (0.03 * base.intake) ** 2)) / 10) * 10,
    weightKg: final.x[W],
    weightSd: Math.sqrt(Math.max(0, final.p[W][W])),
    weeklyRateKg,
    water,
    noiseKg: Math.sqrt(chosen.noise),
    driftKcal: chosen.drift,
    effects: {
      carbsPer100g: learned(B_CARB),
      foodPer1000kcal: learned(B_FOOD),
      lutealKg: learned(B_LUTEAL),
      mensesKg: learned(B_MENSES),
    },
    adaptation,
    weekday: weekdayPattern(days, base.intake),
    confidence: tdeeSd < 70 ? "high" : tdeeSd < 140 ? "medium" : "low",
    outliers: chosen.outliers,
    series: days.slice(gateIndex).map((day, offset) => ({
      date: day.date,
      tdee: Math.round(chosen.steps[gateIndex + offset].x[D] * rho),
      weightKg: smoothed[gateIndex + offset].x[W],
    })),
    model: { energyPerKg: rho, d: final.x[D], pWW: final.p[W][W], pWD: final.p[W][D], pDD: final.p[D][D] },
  };
}

/** Peso esperado en `days` días comiendo `calories` al día, con su incertidumbre. */
export function forecastWeight(
  engine: AdaptiveEstimate,
  calories: number,
  days: number,
): { kg: number; sd: number } {
  const { energyPerKg, d, pWW, pWD, pDD } = engine.model;
  const drift = engine.driftKcal / energyPerKg;
  const variance =
    pWW - 2 * days * pWD + days * days * pDD + days * DRIFT_WEIGHT ** 2 + (drift * drift * days ** 3) / 3;
  return {
    kg: engine.weightKg + days * (calories / energyPerKg - d),
    sd: Math.sqrt(Math.max(0, variance)),
  };
}
