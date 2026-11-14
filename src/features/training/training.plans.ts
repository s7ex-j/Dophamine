import { findExercise, MUSCLE_GROUPS, type MuscleGroup } from "@/src/features/exercises/catalog";
import { templateById, type TemplateId } from "@/src/features/training/training.templates";
import { readCycle, type Cycle } from "@/src/features/training/cycle";

export type TrainingVariant = TemplateId | "custom";
export type GymProfile = "full_gym" | "home" | "limited";
export type TrainingGoal = "strength" | "hypertrophy" | "general";

export type ExercisePlan = { name: string; sets: number; reps: string; rir: number };
/** Lo que se entrena un día de la semana: "Torso A" el lunes, "Pierna A" el martes… */
export type WorkoutDay = {
  day: string;
  name: string;
  exercises: ExercisePlan[];
  /** Qué se entrena ese día (pecho, espalda… o cardio). Guía el catálogo y el nombre. */
  focus?: MuscleGroup[];
};
export type Routine = {
  id: string;
  name: string;
  variant: TrainingVariant;
  /** Días con entreno, en el orden de la semana. Sale de `schedule`. */
  days: string[];
  /** Todos los ejercicios de la semana, sin repetir. Sale de `schedule`. */
  exercises: ExercisePlan[];
  /** Un entreno por día. */
  schedule: WorkoutDay[];
  /** Mesociclo opcional: semanas del bloque y si la última es de descarga. */
  cycle?: Cycle;
  accent: string;
  gymProfile: GymProfile;
  trainingGoal: TrainingGoal;
  sessionMinutes: number;
};

export const WEEK_DAYS = [
  { id: "mon", label: "L" },
  { id: "tue", label: "M" },
  { id: "wed", label: "X" },
  { id: "thu", label: "J" },
  { id: "fri", label: "V" },
  { id: "sat", label: "S" },
  { id: "sun", label: "D" },
];
export const GYM_OPTIONS: Array<{ value: GymProfile; label: string }> = [
  { value: "full_gym", label: "Gimnasio" },
  { value: "home", label: "Casa" },
  { value: "limited", label: "Equipo limitado" },
];
export const GOAL_OPTIONS: Array<{ value: TrainingGoal; label: string }> = [
  { value: "strength", label: "Fuerza" },
  { value: "hypertrophy", label: "Hipertrofia" },
  { value: "general", label: "General" },
];

const plan = (names: string[], goal: TrainingGoal = "hypertrophy"): ExercisePlan[] =>
  names.map((name, index) => ({
    name,
    sets: index === 0 ? 4 : 3,
    reps: goal === "strength" ? (index < 2 ? "4–6" : "6–10") : goal === "general" ? "8–12" : "8–15",
    rir: index === 0 ? 2 : 1,
  }));

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const byWeek = (a: string, b: string) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b);

/** Ordena los días y recalcula `days` y `exercises` a partir de `schedule`. */
export function syncRoutine(routine: Routine): Routine {
  const schedule = [...routine.schedule].sort((a, b) => byWeek(a.day, b.day));
  const seen = new Set<string>();
  const exercises: ExercisePlan[] = [];
  for (const exercise of schedule.flatMap((day) => day.exercises))
    if (!seen.has(exercise.name)) {
      seen.add(exercise.name);
      exercises.push(exercise);
    }
  return { ...routine, schedule, days: schedule.map((day) => day.day), exercises };
}

export function generateRoutine(
  input: Pick<Routine, "variant" | "gymProfile" | "trainingGoal" | "sessionMinutes"> &
    Partial<Pick<Routine, "name" | "days">>,
): Routine {
  const variant: TemplateId = input.variant === "custom" ? "full_body" : input.variant;
  const template = templateById(variant);
  const count = input.sessionMinutes <= 35 ? 4 : input.sessionMinutes >= 70 ? 6 : 5;
  const days = [...(input.days?.length ? input.days : template.days)].sort(byWeek);
  const schedule = days.map((day, index): WorkoutDay => {
    const session = template.sessions[index % template.sessions.length];
    const names = input.gymProfile === "full_gym" ? session.gym : session.home;
    return {
      day,
      name: session.name,
      focus: [...session.focus],
      exercises: plan(names.slice(0, count), input.trainingGoal),
    };
  });
  return syncRoutine({
    id: `routine-${variant}`,
    name: input.name || template.label,
    variant,
    days,
    exercises: [],
    schedule,
    accent: "#34D399",
    gymProfile: input.gymProfile,
    trainingGoal: input.trainingGoal,
    sessionMinutes: input.sessionMinutes,
  });
}

/** Nombre de un día a partir de su enfoque: "Pecho + Brazos". */
export const focusName = (focus: MuscleGroup[]) =>
  focus.map((id) => MUSCLE_GROUPS.find((group) => group.id === id)?.label ?? id).join(" + ");

/**
 * Cambia el enfoque de un día. Si el nombre del día era automático (vacío,
 * "Día N" o el que salía del enfoque anterior), se renombra con el nuevo.
 */
export function setDayFocus(routine: Routine, day: string, focus: MuscleGroup[]): Routine {
  return updateWorkoutDay(routine, day, (workout) => {
    const auto =
      !workout.name.trim() ||
      /^Día \d+$/.test(workout.name) ||
      workout.name === focusName(workout.focus ?? []);
    return { ...workout, focus, name: auto && focus.length ? focusName(focus) : workout.name };
  });
}

/** Lo que trae un ejercicio nuevo: 3 × 12, o 20 minutos si es cardio. */
export const defaultPlan = (name: string): ExercisePlan =>
  findExercise(name)?.cardio ? { name, sets: 1, reps: "20", rir: 0 } : { name, sets: 3, reps: "12", rir: 2 };

/** El entreno de un día de la semana ("mon"…), o null si es de descanso. */
export const workoutFor = (routine: Routine, day: string): WorkoutDay | null =>
  routine.schedule.find((item) => item.day === day) ?? null;

/** Activa o quita un día. Un día nuevo empieza vacío para elegirle los ejercicios. */
export function toggleRoutineDay(routine: Routine, day: string): Routine {
  const exists = routine.schedule.some((item) => item.day === day);
  const schedule = exists
    ? routine.schedule.filter((item) => item.day !== day)
    : [...routine.schedule, { day, name: `Día ${routine.schedule.length + 1}`, exercises: [] }];
  return syncRoutine({ ...routine, variant: "custom", schedule });
}

/** Cambia el entreno de un día con una función. */
export function updateWorkoutDay(
  routine: Routine,
  day: string,
  change: (workout: WorkoutDay) => WorkoutDay,
): Routine {
  return syncRoutine({
    ...routine,
    variant: "custom",
    schedule: routine.schedule.map((item) => (item.day === day ? change(item) : item)),
  });
}

/** Agrega un ejercicio al final del día (si no está ya). */
export const addExerciseToDay = (routine: Routine, day: string, name: string): Routine =>
  updateWorkoutDay(routine, day, (workout) =>
    workout.exercises.some((exercise) => exercise.name === name)
      ? workout
      : { ...workout, exercises: [...workout.exercises, defaultPlan(name)] },
  );

/** Copia los ejercicios (y el nombre) de un día a otro, reemplazando lo que tenía. */
export function copyWorkoutDay(routine: Routine, from: string, to: string): Routine {
  const source = workoutFor(routine, from);
  return source
    ? updateWorkoutDay(routine, to, (workout) => ({
        ...workout,
        name: source.name,
        focus: source.focus ? [...source.focus] : undefined,
        exercises: source.exercises.map((exercise) => ({ ...exercise })),
      }))
    : routine;
}

/** Mueve un ejercicio una posición arriba (-1) o abajo (+1) dentro del día. */
export const moveExercise = (routine: Routine, day: string, index: number, delta: -1 | 1): Routine =>
  updateWorkoutDay(routine, day, (workout) => {
    const target = index + delta;
    if (target < 0 || target >= workout.exercises.length) return workout;
    const exercises = [...workout.exercises];
    [exercises[index], exercises[target]] = [exercises[target], exercises[index]];
    return { ...workout, exercises };
  });

export const DEFAULT_ROUTINES = {
  posterior: generateRoutine({
    variant: "posterior",
    gymProfile: "full_gym",
    trainingGoal: "hypertrophy",
    sessionMinutes: 50,
  }),
};
const toPlan = (exercise: string | Partial<ExercisePlan>): ExercisePlan =>
  typeof exercise === "string"
    ? { name: exercise, sets: 3, reps: "8–12", rir: 2 }
    : {
        name: exercise.name ?? "",
        sets: exercise.sets ?? 3,
        reps: exercise.reps ?? "8–12",
        rir: exercise.rir ?? 2,
      };

/**
 * Lee una rutina guardada. Las de antes de la 0.14.0 tenían una sola lista de
 * ejercicios para todos los días: se convierte en un entreno igual por día.
 */
export function normalizeRoutine(value: unknown): Routine {
  const fallback = DEFAULT_ROUTINES.posterior;
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Partial<Routine> & {
    exercises?: Array<string | ExercisePlan>;
    schedule?: Array<Partial<WorkoutDay>>;
  };
  if (!candidate.name || (!Array.isArray(candidate.exercises) && !Array.isArray(candidate.schedule)))
    return fallback;
  const legacy = (candidate.exercises ?? []).map(toPlan).filter((exercise) => exercise.name);
  const schedule: WorkoutDay[] = Array.isArray(candidate.schedule)
    ? candidate.schedule
        .filter((item) => typeof item.day === "string")
        .map((item) => ({
          day: item.day as string,
          name: item.name || (candidate.name as string),
          ...(Array.isArray(item.focus) ? { focus: item.focus } : {}),
          exercises: (item.exercises ?? []).map(toPlan).filter((exercise) => exercise.name),
        }))
    : (candidate.days ?? fallback.days).map((day) => ({
        day,
        name: candidate.name as string,
        exercises: legacy.map((exercise) => ({ ...exercise })),
      }));
  return syncRoutine({
    ...fallback,
    ...candidate,
    variant: candidate.variant ?? "custom",
    gymProfile: candidate.gymProfile ?? "full_gym",
    trainingGoal: candidate.trainingGoal ?? "hypertrophy",
    sessionMinutes: candidate.sessionMinutes ?? 50,
    schedule,
    cycle: readCycle(candidate.cycle) ?? undefined,
  } as Routine);
}
