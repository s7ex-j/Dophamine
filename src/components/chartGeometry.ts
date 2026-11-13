// Geometría de los gráficos: de una serie de números a coordenadas y trazos SVG.
// Sin dependencias de interfaz, para poder probarla.

export type ChartPoint = { x: number; y: number };
export type LineGeometry = {
  points: ChartPoint[];
  /** Trazo de la línea ("M x y L x y …"). */
  line: string;
  /** Trazo cerrado hasta la base, para rellenar debajo de la línea. */
  area: string;
  /** Altura de la línea de referencia, o null si no hay. */
  referenceY: number | null;
};

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Escala una serie al tamaño del gráfico dejando un margen para que los puntos
 * no se corten. Con menos de dos valores no hay línea que dibujar.
 */
export function linePath(
  values: number[],
  width: number,
  height: number,
  reference?: number,
  padding = 6,
): LineGeometry | null {
  const series = values.filter((value) => Number.isFinite(value));
  if (series.length < 2) return null;
  const all = reference === undefined ? series : [...series, reference];
  const min = Math.min(...all);
  const max = Math.max(...all);
  // Una serie plana se dibuja en el centro en lugar de dividir entre cero.
  const span = max - min || 1;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const y = (value: number) =>
    round(max === min ? height / 2 : padding + innerHeight - ((value - min) / span) * innerHeight);
  const points = series.map((value, index) => ({
    x: round(padding + (innerWidth * index) / (series.length - 1)),
    y: y(value),
  }));
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const last = points[points.length - 1];
  return {
    points,
    line,
    area: `${line} L ${last.x} ${height} L ${points[0].x} ${height} Z`,
    referenceY: reference === undefined ? null : y(reference),
  };
}

/** Marcas "redondas" del eje vertical que cubren de `min` a `max` (pasos de 1, 2, 2.5 o 5 × 10ⁿ). */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1;
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / Math.max(1, count - 1);
  const power = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= max + step * 1e-9; value += step)
    ticks.push(Math.round(value * 1e6) / 1e6);
  if ((ticks.at(-1) as number) < max) ticks.push(Math.round(((ticks.at(-1) as number) + step) * 1e6) / 1e6);
  return ticks;
}

export type ChartSeries = { kind: "line" | "dots" | "bars" | "stack"; values: Array<number | null> };
export type ChartScale = {
  ticks: number[];
  x: (index: number) => number;
  y: (value: number) => number;
  /** Ancho de cada barra. */
  barWidth: number;
};

/**
 * Escala común para varias series en un mismo gráfico. Las barras y las pilas
 * siempre incluyen el cero; las líneas no, para que se vean los cambios pequeños.
 */
export function chartScale(
  series: ChartSeries[],
  width: number,
  height: number,
  options: { left?: number; right?: number; top?: number; bottom?: number; reference?: number } = {},
): ChartScale {
  const { left = 36, right = 8, top = 8, bottom = 8, reference } = options;
  const count = Math.max(1, ...series.map((item) => item.values.length));
  const values: number[] = [];
  const stacks = series.filter((item) => item.kind === "stack");
  if (stacks.length)
    for (let index = 0; index < count; index += 1)
      values.push(stacks.reduce((sum, item) => sum + (item.values[index] ?? 0), 0));
  for (const item of series)
    if (item.kind !== "stack") for (const value of item.values) if (value !== null) values.push(value);
  if (reference !== undefined) values.push(reference);
  if (series.some((item) => item.kind === "bars" || item.kind === "stack")) values.push(0);
  const ticks = niceTicks(values.length ? Math.min(...values) : 0, values.length ? Math.max(...values) : 1);
  const min = ticks[0];
  const max = ticks.at(-1) as number;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const slot = innerWidth / count;
  return {
    ticks,
    x: (index) => round(left + slot * index + slot / 2),
    y: (value) => round(top + innerHeight - ((value - min) / (max - min || 1)) * innerHeight),
    barWidth: round(Math.max(1, Math.min(18, slot * 0.6))),
  };
}
