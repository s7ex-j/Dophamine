import { localDateKey } from "@/src/lib/dates";
import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";

// Cálculos del tablero "Hoy" que no dependen de la interfaz. Se prueban solos.

export type WeekDay = { key: string; day: string; record: DailyBiometrics | undefined };

/** Los últimos siete días (hoy al final), cada uno con su registro si existe. */
export function buildWeek(recentRecords: DailyBiometrics[], today = new Date()): WeekDay[] {
  const recentByDate = new Map(recentRecords.map((record) => [record.date, record]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - index));
    const key = localDateKey(date);
    return {
      key,
      day: date.toLocaleDateString("es-PE", { weekday: "narrow" }).toUpperCase(),
      record: recentByDate.get(key),
    };
  });
}

export type GridKey = "kcal" | "protein" | "fats" | "carbs";
export type GridRow = { key: GridKey; label: string; unit: string; target: number; values: number[] };
export type NutritionTargets = { calories: number; protein: number; fats: number; carbs: number };

/**
 * La cuadrícula de la semana: una fila por dato (calorías y macros), un valor
 * por día. En modo "restante" cada valor es lo que falta para la meta.
 */
export function nutritionGrid(
  week: WeekDay[],
  targets: NutritionTargets,
  mode: "consumed" | "remaining",
): GridRow[] {
  const rows: Array<{
    key: GridKey;
    label: string;
    unit: string;
    target: number;
    field: keyof DailyBiometrics;
  }> = [
    { key: "kcal", label: "kcal", unit: "", target: targets.calories, field: "caloriesIn" },
    { key: "protein", label: "P", unit: "g", target: targets.protein, field: "proteinG" },
    { key: "fats", label: "G", unit: "g", target: targets.fats, field: "fatsG" },
    { key: "carbs", label: "C", unit: "g", target: targets.carbs, field: "carbsG" },
  ];
  return rows.map(({ field, ...row }) => ({
    ...row,
    values: week.map(({ record }) => {
      const consumed = Math.round(Number(record?.[field] ?? 0));
      return mode === "consumed" ? consumed : Math.max(0, row.target - consumed);
    }),
  }));
}
