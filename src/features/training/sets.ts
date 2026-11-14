import type { Equipment } from "@/src/features/exercises/catalog";
import { warmupSets, type GymSetup } from "@/src/features/training/gyms";
import type {
  ActiveSession,
  CompletedSession,
  DraftSet,
  LoggedSet,
  SessionExercise,
  SetType,
} from "@/src/features/training/workout";
import { toKg, weightValue, type WeightUnit } from "@/src/lib/units";

/**
 * Detalles de las series durante la sesión: su tipo (efectiva, calentamiento,
 * drop set, myo-reps, parciales), el lado (izquierdo o derecho) en los
 * ejercicios a una mano o una pierna, y las superseries. Módulo puro.
 */
export const SET_TYPES: SetType[] = ["working", "warmup", "drop", "myo", "partial"];

export const SET_TYPE_LABELS: Record<SetType, string> = {
  working: "Efectiva",
  warmup: "Calentamiento",
  drop: "Drop set",
  myo: "Myo-reps",
  partial: "Parciales",
};

const MARKS: Record<SetType, string> = { working: "", warmup: "C", drop: "D", myo: "M", partial: "P" };

/** Lo que se ve en la columna de la serie: su número o la letra de su tipo. */
export const setMark = (type: SetType, number: number) => MARKS[type] || String(number);

/** Al tocar el número de una serie, pasa al tipo siguiente. */
export const nextSetType = (type: SetType): SetType =>
  SET_TYPES[(SET_TYPES.indexOf(type) + 1) % SET_TYPES.length];

/** Lee un tipo guardado; lo desconocido es una serie efectiva. */
export const readSetType = (value: unknown): SetType =>
  SET_TYPES.includes(value as SetType) ? (value as SetType) : "working";

/**
 * Registrar por lado: cada serie se vuelve dos (izquierda y derecha). Al
 * quitarlo, queda una por par (la de la izquierda) sin lado.
 */
export function toggleSides(exercise: SessionExercise): SessionExercise {
  if (exercise.bySide)
    return {
      ...exercise,
      bySide: false,
      sets: exercise.sets.filter((set) => set.side !== "right").map(({ side: _side, ...set }) => set),
    };
  return {
    ...exercise,
    bySide: true,
    sets: exercise.sets.flatMap((set) => [
      { ...set, side: "left" as const },
      { ...set, side: "right" as const, done: false },
    ]),
  };
}

export type SideBalance = { left: number; right: number; differencePct: number };

/** Volumen (carga × repeticiones) de cada lado y cuánto se aparta el más débil del más fuerte. */
export function sideBalance(sets: LoggedSet[]): SideBalance | null {
  const volume = (side: "left" | "right") =>
    sets
      .filter((set) => set.side === side && set.type !== "warmup")
      .reduce((sum, set) => sum + (set.loadKg ?? 1) * (set.reps ?? 0), 0);
  const left = volume("left");
  const right = volume("right");
  if (!left || !right) return null;
  return {
    left: Math.round(left),
    right: Math.round(right),
    differencePct: Math.round((Math.abs(left - right) / Math.max(left, right)) * 100),
  };
}

/** Une un ejercicio con el siguiente en una superserie, o los separa si ya lo estaban. */
export function toggleSuperset(session: ActiveSession, index: number): ActiveSession {
  const current = session.exercises[index];
  const next = session.exercises[index + 1];
  if (!current || !next) return session;
  const linked = Boolean(current.group) && current.group === next.group;
  const used = new Set(session.exercises.map((exercise) => exercise.group).filter(Boolean));
  const fresh =
    current.group ?? next.group ?? `g${[...Array(26).keys()].find((value) => !used.has(`g${value}`))}`;
  return {
    ...session,
    exercises: session.exercises.map((exercise, place) => {
      if (place !== index && place !== index + 1) return exercise;
      if (!linked) return { ...exercise, group: fresh };
      // Separar: el ejercicio de abajo sale del grupo; si arriba queda solo, también.
      const stillLinked =
        place === index && index > 0 && session.exercises[index - 1].group === current.group;
      return place === index + 1 || !stillLinked ? { ...exercise, group: undefined } : exercise;
    }),
  };
}

/** Etiqueta de cada ejercicio en su superserie ("A1", "A2", "B1"…), o "" si va solo. */
export function supersetLabels(session: ActiveSession): string[] {
  const letters = new Map<string, string>();
  const counters = new Map<string, number>();
  return session.exercises.map((exercise) => {
    const group = exercise.group;
    if (!group || session.exercises.filter((item) => item.group === group).length < 2) return "";
    if (!letters.has(group)) letters.set(group, String.fromCharCode(65 + letters.size));
    const count = (counters.get(group) ?? 0) + 1;
    counters.set(group, count);
    return `${letters.get(group)}${count}`;
  });
}

/** El ejercicio al que conviene ir después: en una superserie, el siguiente del grupo (en ronda). */
export function nextInSuperset(session: ActiveSession, index: number): number | null {
  const group = session.exercises[index]?.group;
  if (!group) return null;
  const members = session.exercises
    .map((exercise, place) => (exercise.group === group ? place : -1))
    .filter((place) => place >= 0);
  if (members.length < 2) return null;
  return members[(members.indexOf(index) + 1) % members.length];
}

/**
 * Agrega el calentamiento sugerido antes de la primera serie efectiva, según su
 * carga (escrita o sugerida). Si ya hay series de calentamiento, no hace nada.
 */
export function withWarmup(
  exercise: SessionExercise,
  equipment: Equipment,
  gym: Pick<GymSetup, "barKg" | "incrementKg">,
  unit: WeightUnit,
): SessionExercise {
  if (exercise.sets.some((set) => set.type === "warmup")) return exercise;
  const first = exercise.sets.find((set) => set.type === "working");
  const typed = Number(first?.load);
  const workingKg = typed > 0 ? toKg(typed, unit) : (first?.suggestion?.loadKg ?? 0);
  const sets: DraftSet[] = warmupSets(workingKg, equipment, gym).map((set) => ({
    type: "warmup",
    load: weightValue(set.loadKg, unit),
    reps: String(set.reps),
    rir: "",
    done: false,
  }));
  return sets.length ? { ...exercise, sets: [...sets, ...exercise.sets] } : exercise;
}

/**
 * Las veces anteriores que se hizo un ejercicio, de la más reciente a la más
 * antigua, con sus series (sin calentamiento). Para verlo mientras se entrena.
 */
export function previousTimes(
  name: string,
  history: CompletedSession[],
  limit = 5,
): Array<{ date: string; sets: LoggedSet[] }> {
  return [...history]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .map((session) => ({
      date: session.completedAt,
      sets: session.sets.filter((set) => set.exerciseName === name && set.type !== "warmup"),
    }))
    .filter((item) => item.sets.length)
    .slice(0, limit);
}

/** "60×10 · 62.5×8" (en la unidad elegida). */
export const describeSets = (sets: LoggedSet[], unit: WeightUnit) =>
  sets
    .map(
      (set) =>
        `${set.loadKg ? `${weightValue(set.loadKg, unit)}×` : ""}${set.reps ?? "—"}${set.side ? (set.side === "left" ? "I" : "D") : ""}`,
    )
    .join(" · ");
