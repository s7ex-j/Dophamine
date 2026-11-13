export type TrainingVariant = "full_body" | "upper_lower" | "posterior" | "push_pull_legs" | "custom";
export type GymProfile = "full_gym" | "home" | "limited";
export type TrainingGoal = "strength" | "hypertrophy" | "general";

export type ExercisePlan = { name: string; sets: number; reps: string; rir: number };
/** Lo que se entrena un día de la semana: "Torso A" el lunes, "Pierna A" el martes… */
export type WorkoutDay = { day: string; name: string; exercises: ExercisePlan[] };
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
export const VARIANT_OPTIONS: Array<{ value: TrainingVariant; label: string }> = [
  { value: "full_body", label: "Full body" },
  { value: "upper_lower", label: "Torso / pierna" },
  { value: "push_pull_legs", label: "Empuje / tirón / pierna" },
  { value: "posterior", label: "Cadena posterior" },
  { value: "custom", label: "Personalizada" },
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

type Template = { name: string; gym: string[]; home: string[] };
const LEGS: Template = {
  name: "Pierna",
  gym: [
    "Sentadilla con barra",
    "Peso muerto rumano",
    "Prensa",
    "Curl femoral sentado",
    "Elevación de talones de pie",
    "Plancha",
  ],
  home: [
    "Sentadilla goblet",
    "Peso muerto con mancuernas",
    "Zancadas",
    "Curl femoral deslizante",
    "Puente de glúteos",
    "Plancha",
  ],
};
const TEMPLATES: Record<Exclude<TrainingVariant, "custom">, { days: string[]; sessions: Template[] }> = {
  full_body: {
    days: ["mon", "wed", "fri"],
    sessions: [
      {
        name: "Full body A",
        gym: [
          "Sentadilla con barra",
          "Press de banca",
          "Remo con barra",
          "Peso muerto rumano",
          "Elevaciones laterales",
          "Plancha",
        ],
        home: [
          "Sentadilla goblet",
          "Flexiones",
          "Remo con mancuerna",
          "Peso muerto con mancuernas",
          "Elevaciones laterales",
          "Plancha",
        ],
      },
      {
        name: "Full body B",
        gym: [
          "Peso muerto convencional",
          "Press militar",
          "Jalón al pecho",
          "Sentadilla búlgara",
          "Curl de bíceps",
          "Extensión de tríceps en polea",
        ],
        home: [
          "Peso muerto a una pierna",
          "Press de hombros con mancuernas",
          "Remo invertido",
          "Sentadilla búlgara",
          "Curl de bíceps",
          "Fondos en banco",
        ],
      },
    ],
  },
  upper_lower: {
    days: ["mon", "tue", "thu", "fri"],
    sessions: [
      {
        name: "Torso A",
        gym: [
          "Press de banca",
          "Remo con barra",
          "Press de hombros con mancuernas",
          "Jalón al pecho",
          "Curl de bíceps",
          "Extensión de tríceps en polea",
        ],
        home: [
          "Flexiones",
          "Remo con mancuerna",
          "Press de hombros con mancuernas",
          "Remo invertido",
          "Curl de bíceps",
          "Fondos en banco",
        ],
      },
      { ...LEGS, name: "Pierna A" },
      {
        name: "Torso B",
        gym: [
          "Press inclinado con mancuernas",
          "Remo sentado en polea",
          "Dominadas",
          "Elevaciones laterales",
          "Curl martillo",
          "Press francés",
        ],
        home: [
          "Flexiones en pica",
          "Remo con mancuerna",
          "Remo invertido",
          "Elevaciones laterales",
          "Curl martillo",
          "Extensión de tríceps con mancuerna",
        ],
      },
      {
        name: "Pierna B",
        gym: [
          "Peso muerto convencional",
          "Sentadilla búlgara",
          "Hip thrust",
          "Extensión de cuádriceps",
          "Elevación de talones sentado",
          "Elevación de piernas colgado",
        ],
        home: [
          "Sentadilla búlgara",
          "Puente de glúteos",
          "Peso muerto a una pierna",
          "Zancadas caminando",
          "Crunch",
          "Plancha lateral",
        ],
      },
    ],
  },
  push_pull_legs: {
    days: ["mon", "wed", "fri"],
    sessions: [
      {
        name: "Empuje",
        gym: [
          "Press de banca",
          "Press militar",
          "Press inclinado con mancuernas",
          "Elevaciones laterales",
          "Extensión de tríceps en polea",
          "Fondos en paralelas",
        ],
        home: [
          "Flexiones",
          "Press de hombros con mancuernas",
          "Flexiones en pica",
          "Elevaciones laterales",
          "Extensión de tríceps con mancuerna",
          "Fondos en banco",
        ],
      },
      {
        name: "Tirón",
        gym: [
          "Dominadas",
          "Remo con barra",
          "Remo sentado en polea",
          "Face pull",
          "Curl de bíceps con barra",
          "Curl martillo",
        ],
        home: [
          "Remo invertido",
          "Remo con mancuerna",
          "Pájaros con mancuernas",
          "Encogimientos de hombros",
          "Curl de bíceps",
          "Curl martillo",
        ],
      },
      LEGS,
    ],
  },
  posterior: {
    days: ["mon", "wed", "fri"],
    sessions: [
      {
        name: "Cadena posterior",
        gym: [
          "Hip thrust",
          "Peso muerto rumano",
          "Curl femoral acostado",
          "Extensión lumbar",
          "Patada de glúteo en polea",
          "Plancha",
        ],
        home: [
          "Puente de glúteos",
          "Peso muerto con mancuernas",
          "Curl femoral deslizante",
          "Extensión lumbar",
          "Peso muerto a una pierna",
          "Plancha",
        ],
      },
    ],
  },
};

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
  const variant = input.variant === "custom" ? "full_body" : input.variant;
  const template = TEMPLATES[variant];
  const count = input.sessionMinutes <= 35 ? 4 : input.sessionMinutes >= 70 ? 6 : 5;
  const days = [...(input.days?.length ? input.days : template.days)].sort(byWeek);
  const schedule = days.map((day, index): WorkoutDay => {
    const session = template.sessions[index % template.sessions.length];
    const names = input.gymProfile === "full_gym" ? session.gym : session.home;
    return { day, name: session.name, exercises: plan(names.slice(0, count), input.trainingGoal) };
  });
  return syncRoutine({
    id: `routine-${variant}`,
    name:
      input.name ||
      {
        full_body: "Full body esencial",
        upper_lower: "Torso / pierna",
        push_pull_legs: "Empuje / tirón / pierna",
        posterior: "Cadena posterior",
      }[variant],
    variant,
    days,
    exercises: [],
    schedule,
    accent: variant === "upper_lower" ? "#D2604B" : variant === "push_pull_legs" ? "#2786D7" : "#167B5B",
    gymProfile: input.gymProfile,
    trainingGoal: input.trainingGoal,
    sessionMinutes: input.sessionMinutes,
  });
}

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
      : { ...workout, exercises: [...workout.exercises, { name, sets: 3, reps: "8–12", rir: 2 }] },
  );

/** Copia los ejercicios (y el nombre) de un día a otro, reemplazando lo que tenía. */
export function copyWorkoutDay(routine: Routine, from: string, to: string): Routine {
  const source = workoutFor(routine, from);
  return source
    ? updateWorkoutDay(routine, to, (workout) => ({
        ...workout,
        name: source.name,
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
export function routineForVariant(variant: Exclude<TrainingVariant, "custom">): Routine {
  return generateRoutine({
    variant,
    gymProfile: "full_gym",
    trainingGoal: "hypertrophy",
    sessionMinutes: 50,
  });
}

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
  } as Routine);
}

export const trainingGoalLabel = (goal: TrainingGoal) =>
  goal === "strength" ? "Fuerza" : goal === "hypertrophy" ? "Hipertrofia" : "Acondicionamiento";

/**
 * Descanso sugerido entre series, en segundos, según el objetivo del bloque.
 * Las series cerca del fallo (RIR 0–1) reciben medio minuto más.
 */
export function restSeconds(goal: TrainingGoal, rir = 2): number {
  const base = goal === "strength" ? 180 : goal === "hypertrophy" ? 90 : 60;
  return rir <= 1 ? base + 30 : base;
}

/** Segundos como reloj: 150 → "2:30". */
export const formatClock = (seconds: number) => {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
};

/** Una línea por ejercicio: "nombre | series | repeticiones | RIR". Es el formato del editor de rutina. */
export const formatExerciseLines = (exercises: ExercisePlan[]) =>
  exercises
    .map((exercise) => `${exercise.name} | ${exercise.sets} | ${exercise.reps} | ${exercise.rir}`)
    .join("\n");

/** Lee el texto del editor. Las líneas sin nombre se descartan y lo que falte toma un valor por defecto. */
export function parseExerciseLines(text: string): ExercisePlan[] {
  return text
    .split("\n")
    .map((line): ExercisePlan | null => {
      const [name, sets, reps, rir] = line.split("|").map((part) => part.trim());
      return name ? { name, sets: Number(sets) || 3, reps: reps || "8–12", rir: Number(rir) || 2 } : null;
    })
    .filter((exercise): exercise is ExercisePlan => Boolean(exercise));
}
