import { estimatedOneRepMax } from "@/src/features/training/strength";
import { weightValue, type WeightUnit } from "@/src/lib/units";
import type { ExercisePlan } from "@/src/features/training/training.plans";

// Sugerencia de progresión por ejercicio a partir de la última serie registrada.
// Los repositorios (SQLite y web) solo buscan esa serie; la regla vive aquí.

export type LastSet = { loadKg: number | null; reps: number | null; rir: number | null };
export type ProgressionHint = {
  exerciseName: string;
  loadKg: number;
  reps: number;
  rir: number | null;
  action: string;
};

export function progressionHintFor(
  exercise: ExercisePlan,
  last: LastSet | null | undefined,
): ProgressionHint | null {
  if (!last?.loadKg || !last.reps) return null;
  const upper = Number(exercise.reps.split("–").at(-1)?.replace(/\D/g, "")) || 12;
  return {
    exerciseName: exercise.name,
    loadKg: last.loadKg,
    reps: last.reps,
    rir: last.rir,
    action:
      last.reps >= upper && (last.rir === null || last.rir >= exercise.rir)
        ? "Prueba subir la carga un paso"
        : "Repite y busca mejorar una repetición",
  };
}

/** "80 kg × 8 · RIR 2 · 1RM est. 101.3 kg", con la carga en la unidad elegida. */
export function hintDetail(hint: ProgressionHint, unit: WeightUnit = "kg") {
  const max = estimatedOneRepMax(hint.loadKg, hint.reps);
  return [
    `${weightValue(hint.loadKg, unit)} ${unit} × ${hint.reps}`,
    hint.rir === null ? "" : `RIR ${hint.rir}`,
    max === null ? "" : `1RM est. ${weightValue(max, unit)} ${unit}`,
  ]
    .filter(Boolean)
    .join(" · ");
}
