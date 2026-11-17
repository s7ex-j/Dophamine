// Cálculos de fuerza que no dependen de la interfaz: el 1RM estimado.

/**
 * Una repetición máxima estimada con la fórmula de Epley: carga × (1 + reps / 30).
 * Solo se estima con 1 a 12 repeticiones; con más, el error crece demasiado.
 */
export function estimatedOneRepMax(load: number, reps: number): number | null {
  if (!(load > 0) || !Number.isFinite(reps) || reps < 1 || reps > 12) return null;
  return reps === 1 ? load : Math.round(load * (1 + reps / 30) * 10) / 10;
}
