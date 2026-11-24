import { COMPLIANCE_ITEMS, complianceScore, type ComplianceKey } from "@/src/features/habits/compliance";
import type { ComplianceDay } from "@/src/features/habits/compliance.data";
import { formatWater } from "@/src/features/water/water";
import { addDays, localDateKey } from "@/src/lib/dates";
import { formatDuration } from "@/src/lib/time";
import { formatWeight, type WeightUnit } from "@/src/lib/units";

/** Fechas de la tira del Panel, cuadrícula del mes y detalle de un día. Módulo puro. */
export const STRIP_DAYS = 7;
export const GOALS = COMPLIANCE_ITEMS.length;
/** Desde esta hora el Panel ofrece cerrar el día. */
export const CLOSING_HOUR = 20;
export const isClosingHour = (hour: number) => hour >= CLOSING_HOUR;

/**
 * Siete días seguidos que terminan hoy. Si se mira un día anterior, la tira se
 * corre para dejarlo en el centro y poder seguir hacia los dos lados.
 */
export function stripDates(selected: string, today: string): string[] {
  const centered = addDays(selected, Math.floor(STRIP_DAYS / 2));
  const recent = selected > addDays(today, -STRIP_DAYS);
  const end = recent || centered > today ? today : centered;
  return Array.from({ length: STRIP_DAYS }, (_, index) => addDays(end, index - STRIP_DAYS + 1));
}

/** Días de una fecha a otra (b − a). */
export function daysBetween(a: string, b: string): number {
  const utc = (key: string) => {
    const [year, month, day] = key.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

export type Month = { year: number; month: number };
/** Mes de una fecha; `month` va de 1 a 12. */
export const monthOf = (key: string): Month => {
  const [year, month] = key.split("-").map(Number);
  return { year, month };
};
export const shiftMonth = ({ year, month }: Month, delta: number): Month => {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
};
export const firstDay = ({ year, month }: Month) => localDateKey(new Date(year, month - 1, 1));

/** Semanas del mes, de lunes a domingo; null en los huecos. */
export function monthWeeks(target: Month): Array<Array<string | null>> {
  const { year, month } = target;
  const lead = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const length = new Date(year, month, 0).getDate();
  const cells: Array<string | null> = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length }, (_, index) => localDateKey(new Date(year, month - 1, index + 1))),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, row) => cells.slice(row * 7, row * 7 + 7));
}

/** Objetivos cumplidos; un día sin nada anotado vale 0 aunque tocara descanso. */
export const dayScore = (day: ComplianceDay | undefined) =>
  day?.logged ? complianceScore(day.compliance) : 0;

export type GoalRow = { key: ComplianceKey; label: string; done: boolean; value: string };

/** Los seis objetivos de un día con su dato. */
export function goalRows(day: ComplianceDay, unit: WeightUnit): GoalRow[] {
  const { record, sleepMinutes, trained, trainingDay, targets } = day;
  const value: Record<ComplianceKey, string> = {
    calories: record?.caloriesIn ? `${Math.round(record.caloriesIn)} de ${targets.calories}` : "Sin anotar",
    water: record?.waterMl ? `${formatWater(record.waterMl)} de ${formatWater(targets.water)}` : "Sin anotar",
    weight: record?.weightKg ? formatWeight(record.weightKg, unit) : "Sin anotar",
    training: trained ? "Hecho" : trainingDay ? "Tocaba entrenar" : "Descanso",
    sleep: sleepMinutes ? formatDuration(sleepMinutes) : "Sin anotar",
    wellbeing: day.compliance.wellbeing ? "Chequeo hecho" : "Sin anotar",
  };
  return COMPLIANCE_ITEMS.map(({ key, label }) => ({
    key,
    label,
    done: day.logged && day.compliance[key],
    value: value[key],
  }));
}
