import { addDays } from "@/src/lib/dates";

/**
 * Racha de registro y Dopi, la mascota que crece con ella. Un día cuenta si se
 * anotó algo (comida, peso o entreno). Hoy sin registrar no corta la racha:
 * todavía hay tiempo. Módulo puro.
 */

/** Días seguidos con registro, terminando hoy o ayer. */
export function currentStreak(dates: Iterable<string>, today: string): number {
  const days = new Set(dates);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

/** La racha más larga de toda la historia. */
export function bestStreak(dates: Iterable<string>): number {
  const sorted = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of sorted) {
    run = previous && addDays(previous, 1) === date ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}

export type PetStage = { level: number; name: string; from: number; next: number | null };

/** Dopi crece con tu mejor racha (nunca encoge): huevo, cría, joven, adulto, sabio, leyenda. */
export const PET_STAGES: Array<Omit<PetStage, "next">> = [
  { level: 0, name: "Huevo", from: 0 },
  { level: 1, name: "Recién nacido", from: 1 },
  { level: 2, name: "Cría", from: 3 },
  { level: 3, name: "Joven", from: 7 },
  { level: 4, name: "Adulto", from: 21 },
  { level: 5, name: "Sabio", from: 60 },
  { level: 6, name: "Leyenda", from: 180 },
];

export function petStage(best: number): PetStage {
  const index = PET_STAGES.reduce((found, stage, place) => (best >= stage.from ? place : found), 0);
  return { ...PET_STAGES[index], next: PET_STAGES[index + 1]?.from ?? null };
}

export type PetMood = "happy" | "waiting" | "sad";

/** Feliz si ya anotaste hoy, esperando si aún no, triste si la racha se cortó. */
export function petMood(loggedToday: boolean, current: number, best: number): PetMood {
  if (loggedToday) return "happy";
  if (current > 0 || best === 0) return "waiting";
  return "sad";
}

export type Achievement = { id: string; title: string; detail: string; unlocked: boolean };

export type AchievementInput = {
  best: number;
  weighIns: number;
  workouts: number;
  goalReached: boolean;
};

const STREAK_GOALS = [3, 7, 30, 100, 365];

/** Los logros: cada uno con lo que pide y si ya se consiguió. */
export function achievements(input: AchievementInput): Achievement[] {
  const list: Achievement[] = [
    ...STREAK_GOALS.map((days) => ({
      id: `streak-${days}`,
      title: `${days} días seguidos`,
      detail: `Registra ${days} días sin cortar la racha.`,
      unlocked: input.best >= days,
    })),
    {
      id: "weigh-1",
      title: "Primer pesaje",
      detail: "Anota tu peso una vez.",
      unlocked: input.weighIns >= 1,
    },
    {
      id: "weigh-30",
      title: "30 pesajes",
      detail: "La tendencia se vuelve fiable.",
      unlocked: input.weighIns >= 30,
    },
    { id: "train-1", title: "Primer entreno", detail: "Termina una sesión.", unlocked: input.workouts >= 1 },
    { id: "train-10", title: "10 entrenos", detail: "Termina 10 sesiones.", unlocked: input.workouts >= 10 },
    { id: "train-50", title: "50 entrenos", detail: "Termina 50 sesiones.", unlocked: input.workouts >= 50 },
    { id: "goal", title: "Peso meta", detail: "Llega a tu peso meta.", unlocked: input.goalReached },
  ];
  return list;
}

/** El texto para compartir un logro. Solo sale si la persona lo envía. */
export function shareText(kind: "streak" | "achievement", value: string, stage: PetStage): string {
  return kind === "streak"
    ? `🔥 Llevo ${value} seguidos registrando en Dophamine. Mi Dopi ya es «${stage.name}».`
    : `🏅 Logro desbloqueado en Dophamine: ${value}.`;
}
