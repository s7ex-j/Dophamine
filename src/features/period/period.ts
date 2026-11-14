import { addDays } from "@/src/lib/dates";

/**
 * Seguimiento del ciclo menstrual, opcional. Se anota cuándo empieza (y, si se
 * quiere, cuándo termina) cada periodo; con eso se estima la duración del
 * ciclo, la fase de hoy y el próximo periodo. Sirve sobre todo para entender
 * el peso: en la fase lútea y en los primeros días del periodo es común retener
 * líquido. No es un método anticonceptivo ni un diagnóstico. Módulo puro.
 */
export const PERIODS_KEY = "menstrual_periods";

export type Period = { start: string; end?: string };
export type Phase = "menstrual" | "follicular" | "ovulation" | "luteal";

export const PHASE_LABELS: Record<Phase, string> = {
  menstrual: "Menstruación",
  follicular: "Fase folicular",
  ovulation: "Ovulación (aprox.)",
  luteal: "Fase lútea",
};

export const PHASE_NOTES: Record<Phase, string> = {
  menstrual: "En los primeros días es común retener algo de líquido; suele bajar al terminar.",
  follicular: "Suele ser la fase con el peso más estable y buena energía para entrenar.",
  ovulation: "Puede haber un pequeño aumento de líquido por unos días.",
  luteal: "Es común retener líquido y tener más hambre: el peso puede subir 0.5–2 kg sin ser grasa.",
};

const DAY = 86_400_000;
const index = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY);
const between = (from: string, to: string) => index(to) - index(from);
const isDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Lee lo guardado, del más antiguo al más reciente, sin fechas inválidas ni repetidas. */
export function readPeriods(value: unknown): Period[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .flatMap((item): Period[] => {
      if (!item || !isDate(item.start) || seen.has(item.start)) return [];
      seen.add(item.start);
      return [
        isDate(item.end) && item.end >= item.start
          ? { start: item.start, end: item.end }
          : { start: item.start },
      ];
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Anota el inicio de un periodo. Si ya hay uno que empezó hace menos de 10 días, no se duplica. */
export function addPeriodStart(periods: Period[], date: string): Period[] {
  if (periods.some((period) => Math.abs(between(period.start, date)) < 10)) return periods;
  return readPeriods([...periods, { start: date }]);
}

/** Anota el final del periodo más reciente que empezó antes de esa fecha. */
export function endPeriod(periods: Period[], date: string): Period[] {
  const last = [...periods].reverse().find((period) => period.start <= date);
  if (!last) return periods;
  return periods.map((period) => (period === last ? { ...period, end: date } : period));
}

export const removePeriod = (periods: Period[], start: string) =>
  periods.filter((period) => period.start !== start);

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** Duración típica del ciclo: la mediana de los últimos 6 (entre 21 y 45 días); 28 sin datos. */
export function cycleLength(periods: Period[]): number {
  const gaps = periods
    .slice(1)
    .map((period, place) => between(periods[place].start, period.start))
    .filter((days) => days >= 21 && days <= 45)
    .slice(-6);
  return gaps.length ? Math.round(median(gaps)) : 28;
}

/** Duración típica del periodo: la mediana de los anotados con final; 5 sin datos. */
export function periodLength(periods: Period[]): number {
  const lengths = periods.flatMap((period) => (period.end ? [between(period.start, period.end) + 1] : []));
  return lengths.length ? Math.round(median(lengths.slice(-6))) : 5;
}

export type CycleStatus = {
  /** Día del ciclo (1 = primer día del periodo). */
  day: number;
  length: number;
  phase: Phase;
  nextStart: string;
  daysUntilNext: number;
  /** El ciclo actual ya pasó de su duración típica. */
  late: boolean;
};

/** Fase de una fecha según el último periodo anotado antes de ella. Null sin periodos. */
export function cycleStatus(periods: Period[], today: string): CycleStatus | null {
  const last = [...periods].reverse().find((period) => period.start <= today);
  if (!last) return null;
  const length = cycleLength(periods);
  const day = between(last.start, today) + 1;
  const bleeding = last.end ? between(last.start, last.end) + 1 : periodLength(periods);
  const ovulation = length - 14;
  const phase: Phase =
    day <= bleeding
      ? "menstrual"
      : day >= ovulation - 1 && day <= ovulation + 1
        ? "ovulation"
        : day < ovulation
          ? "follicular"
          : "luteal";
  const nextStart = addDays(last.start, length);
  return {
    day,
    length,
    phase: day > length ? "luteal" : phase,
    nextStart,
    daysUntilNext: between(today, nextStart),
    late: day > length,
  };
}
