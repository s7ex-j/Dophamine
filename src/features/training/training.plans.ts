export type TrainingVariant = "full_body" | "upper_lower" | "posterior" | "push_pull_legs" | "custom";
export type GymProfile = "full_gym" | "home" | "limited";
export type TrainingGoal = "strength" | "hypertrophy" | "general";

export type ExercisePlan = { name: string; sets: number; reps: string; rir: number };
export type Routine = {
  id: string;
  name: string;
  variant: TrainingVariant;
  days: string[];
  exercises: ExercisePlan[];
  accent: string;
  gymProfile: GymProfile;
  trainingGoal: TrainingGoal;
  sessionMinutes: number;
};

export const WEEK_DAYS = [
  { id: "mon", label: "L" }, { id: "tue", label: "M" }, { id: "wed", label: "X" },
  { id: "thu", label: "J" }, { id: "fri", label: "V" }, { id: "sat", label: "S" }, { id: "sun", label: "D" }
];
export const VARIANT_OPTIONS: Array<{ value: TrainingVariant; label: string }> = [
  { value: "full_body", label: "Full body" }, { value: "upper_lower", label: "Torso / pierna" }, { value: "push_pull_legs", label: "Empuje / tirón" }, { value: "posterior", label: "Cadena posterior" }, { value: "custom", label: "Personalizada" }
];
export const GYM_OPTIONS: Array<{ value: GymProfile; label: string }> = [{ value: "full_gym", label: "Gimnasio" }, { value: "home", label: "Casa" }, { value: "limited", label: "Equipo limitado" }];
export const GOAL_OPTIONS: Array<{ value: TrainingGoal; label: string }> = [{ value: "strength", label: "Fuerza" }, { value: "hypertrophy", label: "Hipertrofia" }, { value: "general", label: "General" }];

const plan = (names: string[], goal: TrainingGoal = "hypertrophy"): ExercisePlan[] => names.map((name, index) => ({ name, sets: index === 0 ? 4 : 3, reps: goal === "strength" ? "4–6" : goal === "general" ? "8–12" : "8–15", rir: index === 0 ? 2 : 1 }));
const byGym = (profile: GymProfile, full: string[], home: string[]) => profile === "full_gym" ? full : profile === "home" ? home : full.map((name) => name.replace("barra", "mancuernas").replace("máquina", "banda"));

export function generateRoutine(input: Pick<Routine, "variant" | "gymProfile" | "trainingGoal" | "sessionMinutes"> & Partial<Pick<Routine, "name" | "days">>): Routine {
  const variant = input.variant === "custom" ? "full_body" : input.variant;
  const exerciseNames: Record<Exclude<TrainingVariant, "custom">, string[]> = {
    full_body: byGym(input.gymProfile, ["Sentadilla con barra", "Press de pecho", "Remo con barra", "Peso muerto rumano", "Plancha"], ["Sentadilla goblet", "Flexiones", "Remo con mancuerna", "Peso muerto con mancuernas", "Plancha"]),
    upper_lower: byGym(input.gymProfile, ["Press de pecho", "Remo en máquina", "Sentadilla con barra", "Hip thrust", "Press militar", "Curl femoral"], ["Flexiones", "Remo con mancuerna", "Sentadilla goblet", "Puente de glúteos", "Press con mancuernas", "Curl femoral deslizante"]),
    push_pull_legs: byGym(input.gymProfile, ["Press de pecho", "Jalón al pecho", "Prensa", "Elevaciones laterales", "Curl de bíceps", "Plancha"], ["Flexiones", "Remo con mancuerna", "Zancadas", "Elevaciones laterales", "Curl con banda", "Plancha"]),
    posterior: byGym(input.gymProfile, ["Hip thrust", "Peso muerto rumano", "Curl femoral", "Extensión lumbar", "Plancha"], ["Puente de glúteos", "Peso muerto con mancuernas", "Curl femoral deslizante", "Buenos días con banda", "Plancha"])
  };
  const defaultDays: Record<Exclude<TrainingVariant, "custom">, string[]> = { full_body: ["mon", "wed", "fri"], upper_lower: ["mon", "tue", "thu", "fri"], push_pull_legs: ["mon", "wed", "fri"], posterior: ["mon", "wed", "fri"] };
  const count = input.sessionMinutes <= 35 ? 4 : input.sessionMinutes >= 70 ? 6 : 5;
  return { id: `routine-${variant}`, name: input.name || ({ full_body: "Full body esencial", upper_lower: "Torso / pierna", push_pull_legs: "Empuje / tirón", posterior: "Cadena posterior" }[variant]), variant, days: input.days?.length ? input.days : defaultDays[variant], exercises: plan(exerciseNames[variant].slice(0, count), input.trainingGoal), accent: variant === "upper_lower" ? "#D2604B" : variant === "push_pull_legs" ? "#2786D7" : "#167B5B", gymProfile: input.gymProfile, trainingGoal: input.trainingGoal, sessionMinutes: input.sessionMinutes };
}

export const DEFAULT_ROUTINES = { posterior: generateRoutine({ variant: "posterior", gymProfile: "full_gym", trainingGoal: "hypertrophy", sessionMinutes: 50 }) };
export function routineForVariant(variant: Exclude<TrainingVariant, "custom">): Routine { return generateRoutine({ variant, gymProfile: "full_gym", trainingGoal: "hypertrophy", sessionMinutes: 50 }); }

export function normalizeRoutine(value: unknown): Routine {
  const fallback = DEFAULT_ROUTINES.posterior;
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Partial<Routine> & { exercises?: Array<string | ExercisePlan> };
  if (!candidate.name || !Array.isArray(candidate.exercises)) return fallback;
  return { ...fallback, ...candidate, variant: candidate.variant ?? "custom", gymProfile: candidate.gymProfile ?? "full_gym", trainingGoal: candidate.trainingGoal ?? "hypertrophy", sessionMinutes: candidate.sessionMinutes ?? 50, days: candidate.days ?? fallback.days, exercises: candidate.exercises.map((exercise) => typeof exercise === "string" ? { name: exercise, sets: 3, reps: "8–12", rir: 2 } : { ...exercise, sets: exercise.sets ?? 3, reps: exercise.reps ?? "8–12", rir: exercise.rir ?? 2 }) };
}
