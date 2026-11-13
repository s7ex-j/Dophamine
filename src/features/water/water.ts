/**
 * Agua del día. La meta es orientativa: 35 ml por kg de peso, más unos 12 ml
 * por minuto de entrenamiento los días que toca entrenar, redondeado a 250 ml.
 * No es una indicación médica: con calor, mucho sudor o alguna condición de
 * salud la necesidad cambia.
 */
export const GLASS_ML = 250;
export const WATER_STEPS = [250, 500];

export function waterTargetMl(weightKg: number | null, trainingMinutes = 0): number {
  const base = (weightKg && weightKg > 0 ? weightKg : 70) * 35;
  const total = base + Math.max(0, trainingMinutes) * 12;
  return Math.round(total / GLASS_ML) * GLASS_ML;
}

/** "2.25 L" o "750 ml". */
export const formatWater = (ml: number) =>
  ml >= 1000 ? `${Math.round(ml / 10) / 100} L` : `${Math.round(ml)} ml`;

/** Suma (o resta) agua sin bajar de cero ni pasar de 10 L. */
export const addWaterMl = (current: number, delta: number) => Math.max(0, Math.min(10000, current + delta));
