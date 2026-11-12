import type { WeightUnit } from "@/src/lib/units";

// Cálculos de fuerza que no dependen de la interfaz: 1RM estimado y discos por lado.

/**
 * Una repetición máxima estimada con la fórmula de Epley: carga × (1 + reps / 30).
 * Solo se estima con 1 a 12 repeticiones; con más, el error crece demasiado.
 */
export function estimatedOneRepMax(load: number, reps: number): number | null {
  if (!(load > 0) || !Number.isFinite(reps) || reps < 1 || reps > 12) return null;
  return reps === 1 ? load : Math.round(load * (1 + reps / 30) * 10) / 10;
}

export const BAR_OPTIONS: Record<WeightUnit, number[]> = { kg: [20, 15, 10], lb: [45, 35, 15] };
export const PLATES: Record<WeightUnit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

export type PlateLoad = {
  /** Discos de un lado, del más pesado al más liviano. */
  perSide: number[];
  /** Peso total que se arma con esos discos. */
  loaded: number;
  /** Lo que falta para el peso pedido porque no hay discos tan pequeños. */
  missing: number;
};

/** Qué discos poner en cada lado de la barra para llegar a un peso total. */
export function plateLoad(target: number, bar: number, plates: number[]): PlateLoad | null {
  if (!(target > 0) || !(bar > 0) || target < bar) return null;
  let remaining = (target - bar) / 2;
  const perSide: number[] = [];
  for (const plate of [...plates].sort((a, b) => b - a)) {
    while (remaining + 1e-9 >= plate) {
      perSide.push(plate);
      remaining -= plate;
    }
  }
  const loaded = bar + perSide.reduce((total, plate) => total + plate, 0) * 2;
  return { perSide, loaded, missing: Math.round((target - loaded) * 100) / 100 };
}

/** "20 + 10 + 2.5" o "solo la barra". */
export const describePlates = (load: PlateLoad) =>
  load.perSide.length ? load.perSide.join(" + ") : "solo la barra";
