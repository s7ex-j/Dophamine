import { toKg, type WeightUnit } from "@/src/lib/units";
import type { ExercisePlan, Routine } from "@/src/features/training/training.plans";
import type { SessionLog } from "@/src/features/training/training.repository";

// Lo que la persona va escribiendo al registrar una sesión, por ejercicio.
// Son textos porque vienen de campos de formulario.
export type LogEntry = { load: string; reps: string; rir: string };
export type LogDraft = Record<string, LogEntry>;

/** Devuelve el borrador con un campo cambiado. El RIR parte del objetivo del ejercicio. */
export function withLogField(
  draft: LogDraft,
  exercise: ExercisePlan,
  field: keyof LogEntry,
  value: string,
): LogDraft {
  const current = draft[exercise.name];
  const entry: LogEntry = {
    load: current?.load ?? "",
    reps: current?.reps ?? "",
    rir: current?.rir ?? String(exercise.rir),
  };
  return { ...draft, [exercise.name]: { ...entry, [field]: value } };
}

/**
 * Convierte el borrador en los registros que se guardan. Un campo vacío o inválido queda en null.
 * La carga se escribe en la unidad elegida y se guarda en kilogramos.
 */
export function buildSessionLogs(routine: Routine, draft: LogDraft, unit: WeightUnit = "kg"): SessionLog[] {
  const load = (text: string | undefined) => (Number(text) > 0 ? toKg(Number(text), unit) : null);
  return routine.exercises.map((exercise) => ({
    exerciseName: exercise.name,
    loadKg: load(draft[exercise.name]?.load),
    reps: Number(draft[exercise.name]?.reps) || null,
    rir: Number(draft[exercise.name]?.rir) || null,
  }));
}
