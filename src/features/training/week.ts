import { findExercise, MUSCLE_LABELS, type Muscle } from "@/src/features/exercises/catalog";
import { estimatedOneRepMax } from "@/src/features/training/strength";
import { WEEK_DAYS, workoutFor, type Routine } from "@/src/features/training/training.plans";
import {
  setsPerMuscle,
  setsVolume,
  type CompletedSession,
  type LoggedSet,
} from "@/src/features/training/workout";
import { addDays, localDateKey } from "@/src/lib/dates";

/**
 * La semana de entreno vista de un vistazo: qué toca cada día, qué ya se hizo,
 * el volumen semana a semana y la mejor marca reciente de cada ejercicio.
 * Módulo puro: recibe la rutina y el historial ya cargados.
 */

const WEEKDAY_IDS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
/** "mon"… de una fecha local. */
export const weekdayId = (date: Date) => WEEKDAY_IDS[date.getDay()];

/** Lunes (AAAA-MM-DD) de la semana de una fecha local. */
export function weekStart(date: Date): string {
  const offset = (date.getDay() + 6) % 7;
  return localDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset));
}

const sessionDate = (session: CompletedSession) => localDateKey(new Date(session.completedAt));

export type WeekDayStatus = {
  day: string;
  label: string;
  date: string;
  /** Nombre del entreno de ese día, o null si es de descanso. */
  workout: string | null;
  exercises: number;
  /** Sesiones registradas ese día (con o sin plan). */
  done: number;
  isToday: boolean;
  isPast: boolean;
};

/** Los 7 días de la semana actual (de lunes a domingo) con su plan y lo hecho. */
export function weekProgress(routine: Routine, sessions: CompletedSession[], today: Date): WeekDayStatus[] {
  const monday = weekStart(today);
  const todayKey = localDateKey(today);
  return WEEK_DAYS.map((weekday, index) => {
    const date = addDays(monday, index);
    const workout = workoutFor(routine, weekday.id);
    return {
      day: weekday.id,
      label: weekday.label,
      date,
      workout: workout?.name ?? null,
      exercises: workout?.exercises.length ?? 0,
      done: sessions.filter((session) => sessionDate(session) === date).length,
      isToday: date === todayKey,
      isPast: date < todayKey,
    };
  });
}

export type WeekVolume = { weekStart: string; sessions: number; sets: number; volumeKg: number };

/** Sesiones, series efectivas y kilos levantados por semana, de la más antigua a la actual. */
export function weeklyVolume(sessions: CompletedSession[], today: Date, weeks = 8): WeekVolume[] {
  const current = weekStart(today);
  const starts = Array.from({ length: weeks }, (_, index) => addDays(current, -7 * (weeks - 1 - index)));
  return starts.map((start) => {
    const end = addDays(start, 7);
    const inWeek = sessions.filter((session) => {
      const date = sessionDate(session);
      return date >= start && date < end;
    });
    const sets = inWeek.flatMap((session) => session.sets);
    return {
      weekStart: start,
      sessions: inWeek.length,
      sets: sets.filter((set) => set.type !== "warmup").length,
      volumeKg: setsVolume(sets),
    };
  });
}

export type ExerciseBest = {
  name: string;
  lastDate: string;
  sessions: number;
  /** La serie con mejor 1RM estimado de la última vez. */
  lastBest: { loadKg: number; reps: number } | null;
  lastOneRepMax: number | null;
  /** Diferencia del 1RM estimado frente a la vez anterior. */
  changeKg: number | null;
};

const bestSet = (sets: LoggedSet[]) => {
  let best: { loadKg: number; reps: number; oneRepMax: number } | null = null;
  for (const set of sets) {
    if (set.type === "warmup" || !set.loadKg || !set.reps) continue;
    const oneRepMax = estimatedOneRepMax(set.loadKg, set.reps);
    if (oneRepMax !== null && (!best || oneRepMax > best.oneRepMax))
      best = { loadKg: set.loadKg, reps: set.reps, oneRepMax };
  }
  return best;
};

/** Cada ejercicio hecho, con su mejor serie de la última vez y si subió o bajó. Los más recientes primero. */
export function exerciseBests(sessions: CompletedSession[]): ExerciseBest[] {
  const ordered = [...sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const names = [...new Set(ordered.flatMap((session) => session.sets.map((set) => set.exerciseName)))];
  return names.map((name) => {
    const appearances = ordered
      .map((session) => ({ session, sets: session.sets.filter((set) => set.exerciseName === name) }))
      .filter((item) => item.sets.length);
    const last = bestSet(appearances[0].sets);
    const before = appearances[1] ? bestSet(appearances[1].sets) : null;
    return {
      name,
      lastDate: sessionDate(appearances[0].session),
      sessions: appearances.length,
      lastBest: last ? { loadKg: last.loadKg, reps: last.reps } : null,
      lastOneRepMax: last ? Math.round(last.oneRepMax * 10) / 10 : null,
      changeKg: last && before ? Math.round((last.oneRepMax - before.oneRepMax) * 10) / 10 : null,
    };
  });
}

/** Volumen semanal recomendado por músculo para ganar masa muscular (series efectivas). */
export const SETS_TARGET = { min: 10, max: 20 };

export type MuscleLoad = { muscle: Muscle; label: string; sets: number; level: 0 | 1 | 2 | 3 };

/**
 * Series de la semana por cada uno de los músculos del mapa, con un nivel para
 * colorearlo: 0 nada, 1 poco (menos de 5), 2 algo (5 a 9), 3 suficiente (10 o más).
 */
export function muscleLoads(sessions: CompletedSession[]): MuscleLoad[] {
  const sets = new Map(setsPerMuscle(sessions).map((item) => [item.muscle, item.sets]));
  return (Object.keys(MUSCLE_LABELS) as Muscle[]).map((muscle) => {
    const value = sets.get(muscle) ?? 0;
    return {
      muscle,
      label: MUSCLE_LABELS[muscle],
      sets: value,
      level: value === 0 ? 0 : value < 5 ? 1 : value < SETS_TARGET.min ? 2 : 3,
    };
  });
}

/** Ejercicios de una sesión que están en el catálogo con imagen (para miniaturas). */
export const mediaOf = (names: string[]) =>
  names.map((name) => findExercise(name)?.media ?? null).filter((media): media is string => Boolean(media));
