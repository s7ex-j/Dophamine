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
