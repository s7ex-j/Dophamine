// Geometría del reloj de 24 horas (medianoche arriba, en el sentido de las agujas). Módulo puro.

const DAY = 24 * 60;
const TAU = Math.PI * 2;

const wrap = (minutes: number) => ((minutes % DAY) + DAY) % DAY;

/** Ángulo en radianes de una hora del día, con la medianoche arriba. */
export const angleOf = (minutes: number) => (wrap(minutes) / DAY) * TAU - Math.PI / 2;

/** El punto del círculo en el que cae una hora. */
export function pointOf(minutes: number, center: number, radius: number): { x: number; y: number } {
  const angle = angleOf(minutes);
  return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
}

/** La hora que señala un punto tocado, redondeada a `step` minutos. */
export function minutesAt(x: number, y: number, center: number, step = 5): number {
  const angle = Math.atan2(y - center, x - center) + Math.PI / 2;
  const turn = ((angle % TAU) + TAU) % TAU;
  return wrap(Math.round(((turn / TAU) * DAY) / step) * step);
}

/** Minutos que van de `from` a `to` avanzando en el reloj (de acostarse a despertar). */
export const spanOf = (from: number, to: number) => wrap(to - from);

/** Distancia entre dos horas en el reloj, por el lado más corto. */
export function gapOf(a: number, b: number): number {
  const span = spanOf(a, b);
  return Math.min(span, DAY - span);
}

/** El trazo SVG del arco de `from` a `to` en el sentido de las agujas. */
export function arcPath(from: number, to: number, center: number, radius: number): string {
  const span = spanOf(from, to);
  if (span === 0) return "";
  const start = pointOf(from, center, radius);
  const end = pointOf(to, center, radius);
  const large = span > DAY / 2 ? 1 : 0;
  const r = radius.toFixed(2);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

/** Suma minutos a una hora y vuelve a dar la vuelta al pasar la medianoche. */
export const shiftMinutes = (minutes: number, delta: number) => wrap(minutes + delta);
