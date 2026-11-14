import { findExercise, MUSCLE_LABELS, type Muscle } from "@/src/features/exercises/catalog";
import { estimatedOneRepMax } from "@/src/features/training/strength";
import { formatTime, parseTime } from "@/src/lib/time";
import type { Routine, WorkoutDay } from "@/src/features/training/training.plans";
import { deloadLoad, deloadPlan } from "@/src/features/training/cycle";
import { roundLoad } from "@/src/features/training/gyms";
import { toKg, weightValue, type WeightUnit } from "@/src/lib/units";

/**
 * Entrenamiento serie por serie: la sesión en curso, la sugerencia de carga de
 * cada serie, el cierre de la sesión y los récords. Módulo puro; guardar es de
 * `training.repository`.
 */
export type SetType = "warmup" | "working" | "drop" | "myo" | "partial";
export type Side = "left" | "right";

/** Una serie ya guardada. Los pesos en kg. */
export type LoggedSet = {
  exerciseName: string;
  exerciseId?: string;
  setNumber: number;
  type: SetType;
  loadKg: number | null;
  reps: number | null;
  rir: number | null;
  side?: Side;
};
/** Una sesión guardada, con todas sus series. */
export type CompletedSession = {
  id: string;
  name: string;
  startedAt: string;
  completedAt: string;
  sets: LoggedSet[];
};

export type Target = { sets: number; repsMin: number; repsMax: number; rir: number };
export type Suggestion = { loadKg: number | null; reps: number };
/** Una serie mientras se entrena: lo escrito es texto, en la unidad elegida. */
export type DraftSet = {
  type: SetType;
  load: string;
  reps: string;
  rir: string;
  done: boolean;
  side?: Side;
  suggestion?: Suggestion;
};
export type SessionExercise = {
  name: string;
  exerciseId?: string;
  target: Target;
  sets: DraftSet[];
  note?: string;
  /** Descanso sugerido entre series, en segundos. */
  restSeconds?: number;
  /** Se registra por lado: cada serie tiene su versión izquierda y derecha. */
  bySide?: boolean;
  /** Superserie: los ejercicios con el mismo grupo se hacen alternados. */
  group?: string;
};
export type ActiveSession = {
  id: string;
  routineName: string;
  startedAt: string;
  /** Sesión de una semana de descarga. */
  deload?: boolean;
  exercises: SessionExercise[];
};

/** "8–12", "8-12" o "10" → rango de repeticiones. */
export function parseRepRange(text: string): { repsMin: number; repsMax: number } {
  const numbers = (text.match(/\d+/g) ?? []).map(Number);
  const repsMin = numbers[0] || 8;
  const repsMax = numbers[1] && numbers[1] >= repsMin ? numbers[1] : repsMin;
  return { repsMin, repsMax };
}

/** Paso de carga: 2.5 kg en ejercicios pesados, 1 kg en los livianos (mancuernas, aislamiento). */
export const loadStep = (loadKg: number) => (loadKg >= 20 ? 2.5 : 1);

/**
 * Doble progresión: si la vez anterior todas las series efectivas llegaron al
 * tope del rango con el RIR pedido (o más), se sube la carga y se vuelve al
 * mínimo de repeticiones; si no, se repite la carga buscando una repetición más.
 */
export function suggestNext(previous: LoggedSet[], target: Target): Suggestion {
  const working = previous.filter((set) => set.type === "working" && set.loadKg && set.reps);
  if (!working.length) return { loadKg: null, reps: target.repsMin };
  const load = Math.max(...working.map((set) => set.loadKg as number));
  const atLoad = working.filter((set) => set.loadKg === load);
  const allTop = atLoad.every(
    (set) => (set.reps as number) >= target.repsMax && (set.rir === null || set.rir >= target.rir),
  );
  if (allTop) return { loadKg: Math.round((load + loadStep(load)) * 100) / 100, reps: target.repsMin };
  // Se apunta a mejorar la serie más floja: así todas van llegando al tope.
  const best = Math.min(...atLoad.map((set) => set.reps as number));
  return { loadKg: load, reps: Math.min(target.repsMax, best + 1) };
}

/** Las series de la última sesión en que se hizo un ejercicio (las sesiones vienen de la más reciente a la más antigua). */
export function lastSetsFor(name: string, history: CompletedSession[]): LoggedSet[] {
  for (const session of history) {
    const sets = session.sets.filter((set) => set.exerciseName === name);
    if (sets.length) return sets;
  }
  return [];
}

/** Un ejercicio listo para entrenar: sus series con la carga sugerida por la última vez. */
export type SessionOptions = {
  /** Semana de descarga del mesociclo: la mitad de las series y 10 % menos de carga. */
  deload?: boolean;
  /** Salto mínimo de carga del gimnasio activo, para redondear la sugerencia. */
  incrementKg?: number;
};

export function sessionExercise(
  input: { name: string; sets: number; reps: string; rir: number },
  history: CompletedSession[],
  unit: WeightUnit,
  options: SessionOptions = {},
): SessionExercise {
  const plan = options.deload ? deloadPlan(input) : input;
  const target = { sets: plan.sets, rir: plan.rir, ...parseRepRange(plan.reps) };
  const base = suggestNext(lastSetsFor(plan.name, history), target);
  let loadKg = base.loadKg;
  if (loadKg !== null && options.deload) loadKg = deloadLoad(loadKg);
  if (loadKg !== null && options.incrementKg) loadKg = roundLoad(loadKg, options.incrementKg);
  const suggestion = { ...base, loadKg };
  const catalog = findExercise(plan.name);
  return {
    name: plan.name,
    ...(catalog ? { exerciseId: catalog.id } : {}),
    target,
    sets: Array.from({ length: Math.max(1, plan.sets) }, () => ({
      type: "working" as const,
      load: suggestion.loadKg === null ? "" : weightValue(suggestion.loadKg, unit),
      reps: "",
      rir: String(plan.rir),
      done: false,
      suggestion,
    })),
  };
}

/**
 * Arma la sesión a partir del entreno de un día (por defecto, el primero de la
 * rutina), con la sugerencia de cada serie.
 */
export function startSession(
  routine: Routine,
  history: CompletedSession[],
  unit: WeightUnit,
  now: Date,
  id: string,
  workout: WorkoutDay | null = routine.schedule[0] ?? null,
  options: SessionOptions = {},
): ActiveSession {
  const plans = workout ? workout.exercises : routine.exercises;
  return {
    id,
    routineName: workout?.name ?? routine.name,
    startedAt: now.toISOString(),
    ...(options.deload ? { deload: true } : {}),
    exercises: plans.map((plan) => sessionExercise(plan, history, unit, options)),
  };
}

/** Agrega un ejercicio a la sesión en curso (por ejemplo, uno que no estaba en el plan). */
export const addExerciseToSession = (
  session: ActiveSession,
  name: string,
  history: CompletedSession[],
  unit: WeightUnit,
): ActiveSession => ({
  ...session,
  exercises: [...session.exercises, sessionExercise({ name, sets: 3, reps: "8–12", rir: 2 }, history, unit)],
});

/** Agrega una serie al final (o de calentamiento al inicio), copiando la carga de la última. */
export function addSet(exercise: SessionExercise, type: SetType = "working"): SessionExercise {
  const last = exercise.sets.at(-1);
  const set: DraftSet = { type, load: last?.load ?? "", reps: "", rir: last?.rir ?? "", done: false };
  return { ...exercise, sets: type === "warmup" ? [set, ...exercise.sets] : [...exercise.sets, set] };
}

/** Cambia un ejercicio por otro del catálogo, conservando el objetivo y las series sin hacer. */
export function swapExercise(exercise: SessionExercise, name: string, exerciseId?: string): SessionExercise {
  return {
    ...exercise,
    name,
    ...(exerciseId ? { exerciseId } : { exerciseId: undefined }),
    sets: exercise.sets.map((set) => (set.done ? set : { ...set, load: "", suggestion: undefined })),
  };
}

const number = (text: string) => (text.trim() && Number.isFinite(Number(text)) ? Number(text) : null);

/**
 * Cierra la sesión: solo cuentan las series marcadas como hechas. La carga se
 * escribe en la unidad elegida y se guarda en kg.
 */
export function finishSession(
  session: ActiveSession,
  unit: WeightUnit,
  now: Date,
): { session: CompletedSession; error: null } | { session: null; error: string } {
  const sets: LoggedSet[] = session.exercises.flatMap((exercise) => {
    let counter = 0;
    return exercise.sets.flatMap((set) => {
      if (!set.done) return [];
      counter += 1;
      const load = number(set.load);
      const reps = number(set.reps);
      const rir = number(set.rir);
      return [
        {
          exerciseName: exercise.name,
          ...(exercise.exerciseId ? { exerciseId: exercise.exerciseId } : {}),
          setNumber: counter,
          type: set.type,
          loadKg: load !== null && load > 0 ? toKg(load, unit) : null,
          reps: reps !== null && reps >= 0 ? Math.round(reps) : null,
          rir: rir !== null && rir >= 0 ? Math.min(10, Math.round(rir)) : null,
          ...(set.side ? { side: set.side } : {}),
        },
      ];
    });
  });
  if (!sets.length)
    return { session: null, error: "Marca como hecha al menos una serie para guardar la sesión." };
  return {
    session: {
      id: session.id,
      name: session.routineName,
      startedAt: session.startedAt,
      completedAt: now.toISOString(),
      sets,
    },
    error: null,
  };
}

/** Kilos levantados: carga × repeticiones de las series efectivas. */
export const setsVolume = (sets: LoggedSet[]) =>
  Math.round(
    sets
      .filter((set) => set.type !== "warmup")
      .reduce((sum, set) => sum + (set.loadKg ?? 0) * (set.reps ?? 0), 0),
  );

export type SessionStats = {
  durationMinutes: number;
  volumeKg: number;
  workingSets: number;
  exercises: number;
};
export function sessionStats(session: CompletedSession): SessionStats {
  return {
    durationMinutes: Math.max(
      0,
      Math.round((Date.parse(session.completedAt) - Date.parse(session.startedAt)) / 60000),
    ),
    volumeKg: setsVolume(session.sets),
    workingSets: session.sets.filter((set) => set.type !== "warmup").length,
    exercises: new Set(session.sets.map((set) => set.exerciseName)).size,
  };
}

const bestOneRepMax = (sets: LoggedSet[]) =>
  Math.max(
    0,
    ...sets.flatMap((set) => {
      const value =
        set.type !== "warmup" && set.loadKg && set.reps ? estimatedOneRepMax(set.loadKg, set.reps) : null;
      return value === null ? [] : [value];
    }),
  );
const heaviest = (sets: LoggedSet[]) =>
  Math.max(0, ...sets.filter((set) => set.type !== "warmup" && set.reps).map((set) => set.loadKg ?? 0));

export type PersonalRecord = {
  exerciseName: string;
  kind: "oneRepMax" | "volume" | "load";
  value: number;
  previous: number;
};
export const RECORD_LABELS: Record<PersonalRecord["kind"], string> = {
  oneRepMax: "1RM estimado",
  volume: "Volumen",
  load: "Carga máxima",
};

/**
 * Récords de una sesión frente a todas las anteriores: 1RM estimado, volumen
 * del ejercicio en una sesión y carga más alta. La primera vez que se hace un
 * ejercicio no cuenta como récord.
 */
export function personalRecords(session: CompletedSession, previous: CompletedSession[]): PersonalRecord[] {
  const names = [...new Set(session.sets.map((set) => set.exerciseName))];
  return names.flatMap((name) => {
    const now = session.sets.filter((set) => set.exerciseName === name);
    const before = previous
      .map((item) => item.sets.filter((set) => set.exerciseName === name))
      .filter((sets) => sets.length);
    if (!before.length) return [];
    const records: PersonalRecord[] = [];
    const pairs: Array<[PersonalRecord["kind"], number, number]> = [
      ["oneRepMax", bestOneRepMax(now), Math.max(...before.map(bestOneRepMax))],
      ["volume", setsVolume(now), Math.max(...before.map(setsVolume))],
      ["load", heaviest(now), Math.max(...before.map(heaviest))],
    ];
    for (const [kind, value, best] of pairs)
      if (value > 0 && value > best) records.push({ exerciseName: name, kind, value, previous: best });
    return records;
  });
}

/** Mejor 1RM estimado y volumen de un ejercicio en cada sesión, de la más antigua a la más reciente. */
export function exerciseProgress(name: string, sessions: CompletedSession[]) {
  return [...sessions]
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
    .flatMap((session) => {
      const sets = session.sets.filter((set) => set.exerciseName === name);
      if (!sets.length) return [];
      return [
        {
          completedAt: session.completedAt,
          oneRepMax: bestOneRepMax(sets),
          volume: setsVolume(sets),
          heaviest: heaviest(sets),
        },
      ];
    });
}

/**
 * Series efectivas por músculo: 1 por cada serie de un ejercicio donde el
 * músculo es principal y ½ donde es secundario. Los ejercicios fuera del
 * catálogo no se cuentan.
 */
export function setsPerMuscle(
  sessions: CompletedSession[],
): Array<{ muscle: Muscle; label: string; sets: number }> {
  const totals = new Map<Muscle, number>();
  for (const set of sessions.flatMap((session) => session.sets)) {
    if (set.type === "warmup") continue;
    const exercise = findExercise(set.exerciseName);
    // El cardio se cuenta en minutos, no como series de un músculo.
    if (!exercise || exercise.cardio) continue;
    for (const muscle of exercise.primary) totals.set(muscle, (totals.get(muscle) ?? 0) + 1);
    for (const muscle of exercise.secondary) totals.set(muscle, (totals.get(muscle) ?? 0) + 0.5);
  }
  return [...totals.entries()]
    .map(([muscle, sets]) => ({ muscle, label: MUSCLE_LABELS[muscle], sets }))
    .sort((a, b) => b.sets - a.sets);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Corrige la hora de inicio ("18:05") si empezaste antes de abrirla. Se toma
 * el mismo día de la sesión; si esa hora todavía no llega, se deja como estaba.
 */
export function withStartTime(session: ActiveSession, time: string, now: Date): ActiveSession {
  const minutes = parseTime(time);
  if (minutes === null) return session;
  const start = new Date(session.startedAt);
  start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return start.getTime() > now.getTime() ? session : { ...session, startedAt: start.toISOString() };
}

/** Hora local de inicio y de fin ("18:05") de una sesión. */
export const sessionClock = (session: Pick<CompletedSession, "startedAt" | "completedAt">) => {
  const local = (iso: string) => {
    const date = new Date(iso);
    return formatTime(date.getHours() * 60 + date.getMinutes());
  };
  return { start: local(session.startedAt), end: local(session.completedAt) };
};

/** Lee una sesión en curso guardada. Devuelve null si no sirve. */
export function readActiveSession(value: unknown): ActiveSession | null {
  if (!isRecord(value) || typeof value.id !== "string" || !Array.isArray(value.exercises)) return null;
  return value as ActiveSession;
}
