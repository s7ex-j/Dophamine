import { findExercise } from "@/src/features/exercises/catalog";
import type { CompletedSession } from "@/src/features/training/workout";

/**
 * Energía del entreno a partir de lo registrado: la hora de inicio y de fin de
 * cada sesión, los minutos de cardio y el MET de cada ejercicio (RepDB).
 * Se usa en la revisión del plan y en "Cómo se calcula". Módulo puro.
 */

/** MET neto (por encima del reposo) de la fuerza: igual que en el gasto inicial. */
export const STRENGTH_NET_MET = 3.5;
const MAX_SESSION_MINUTES = 240;

/** Minutos entre el inicio y el fin. Si no hay horario creíble, ~2.5 min por serie. */
export function sessionDurationMinutes(session: CompletedSession): number {
  const minutes = (Date.parse(session.completedAt) - Date.parse(session.startedAt)) / 60000;
  if (Number.isFinite(minutes) && minutes >= 5 && minutes <= MAX_SESSION_MINUTES) return Math.round(minutes);
  return Math.round(session.sets.length * 2.5);
}

/** Minutos de cardio de la sesión (en el cardio, las "repeticiones" son minutos). */
export function cardioMinutes(session: CompletedSession): Array<{ minutes: number; met: number }> {
  return session.sets.flatMap((set) => {
    const exercise = findExercise(set.exerciseName);
    return exercise?.cardio && set.reps ? [{ minutes: set.reps, met: exercise.met ?? 7 }] : [];
  });
}

/** kcal netas de una sesión: fuerza el resto del tiempo y cada cardio con su MET. */
export function sessionEnergyKcal(session: CompletedSession, weightKg: number): number {
  const cardio = cardioMinutes(session);
  const cardioTotal = cardio.reduce((sum, item) => sum + item.minutes, 0);
  const strengthMinutes = Math.max(0, sessionDurationMinutes(session) - cardioTotal);
  const strength = (STRENGTH_NET_MET * weightKg * strengthMinutes) / 60;
  const aerobic = cardio.reduce(
    (sum, item) => sum + (Math.max(0, item.met - 1) * weightKg * item.minutes) / 60,
    0,
  );
  return Math.round(strength + aerobic);
}

export type TrainingLoad = { sessions: number; minutes: number; kcal: number };

/** Sesiones, minutos y kcal netas entre dos fechas locales (incluidas). */
export function trainingLoad(
  sessions: CompletedSession[],
  from: string,
  to: string,
  weightKg: number,
  dateOf: (session: CompletedSession) => string,
): TrainingLoad {
  const inRange = sessions.filter((session) => {
    const date = dateOf(session);
    return date >= from && date <= to;
  });
  return {
    sessions: inRange.length,
    minutes: inRange.reduce((sum, session) => sum + sessionDurationMinutes(session), 0),
    kcal: inRange.reduce((sum, session) => sum + sessionEnergyKcal(session, weightKg), 0),
  };
}
