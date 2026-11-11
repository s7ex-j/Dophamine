import type { TrendPoint } from "@/src/features/tdee/tdee";

/** Una columna del gráfico: alturas en porcentaje (0–100) dentro del área visible. */
export type TrendColumn = { date: string; trendPct: number; weightPct: number };

/**
 * Convierte los puntos de tendencia en alturas para dibujar.
 *
 * La escala va del valor más bajo al más alto de la ventana, con un margen. No
 * parte de cero: entre 76 y 79 kg, una escala desde 0 dejaría todas las barras
 * casi iguales y la tendencia no se vería.
 */
export function trendColumns(points: TrendPoint[]): TrendColumn[] {
  if (points.length === 0) return [];
  const values = points.flatMap((point) => [point.trendKg, point.weightKg]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const margin = Math.max(0.2, (max - min) * 0.15);
  const low = min - margin;
  const span = max + margin - low;
  const toPct = (kg: number) => Math.round(((kg - low) / span) * 1000) / 10;
  return points.map((point) => ({
    date: point.date,
    trendPct: toPct(point.trendKg),
    weightPct: toPct(point.weightKg),
  }));
}
