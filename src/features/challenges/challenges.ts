import { COMPLIANCE_ITEMS, type ComplianceKey, type DayCompliance } from "@/src/features/habits/compliance";
import { addDays } from "@/src/lib/dates";

/**
 * Retos de 21 días: repetir un compromiso del cumplimiento tres semanas. Se
 * marcan solos con lo que ya se registra. Un día fallado no reinicia el reto:
 * se permite uno por cada semana del reto; dos en la misma semana lo pierden.
 * Se guardan en ajustes (`challenges`) y viajan en el respaldo. Módulo puro.
 */
export const CHALLENGES_KEY = "challenges";
export const CHALLENGE_DAYS = 21;
const MISSES_PER_WEEK = 1;

export type Challenge = { key: ComplianceKey; start: string };
export type ChallengeRecord = Challenge & { end: string; result: "done" | "lost" };
export type Challenges = { active: Challenge[]; history: ChallengeRecord[] };
export const EMPTY_CHALLENGES: Challenges = { active: [], history: [] };

export const CHALLENGE_TEXT: Record<ComplianceKey, { title: string; detail: string }> = {
  calories: { title: "Calorías en tu meta", detail: "Dentro de ±10 % de tu objetivo cada día" },
  water: { title: "Agua todos los días", detail: "Llegar a tu meta de agua" },
  weight: { title: "Pesarse cada mañana", detail: "Afina el motor de autoajuste más rápido" },
  training: { title: "Cumplir tu rutina", detail: "Entrenar los días que tocan" },
  sleep: { title: "Dormir 7 horas", detail: "Se marca solo con tu sueño anotado" },
  wellbeing: { title: "Chequeo de bienestar", detail: "Tres preguntas cada día" },
};

export type DayMark = "done" | "missed" | "today" | "pending";
export type ChallengeProgress = {
  challenge: Challenge;
  /** Día del reto que es hoy (1 a 21; más de 21 si ya terminó). */
  day: number;
  marks: DayMark[];
  done: number;
  missed: number;
  status: "active" | "done" | "lost";
};

const isKey = (value: unknown): value is ComplianceKey => COMPLIANCE_ITEMS.some((item) => item.key === value);
const isDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export function readChallenges(value: unknown): Challenges {
  if (!value || typeof value !== "object") return EMPTY_CHALLENGES;
  const raw = value as Partial<Challenges>;
  const active = (Array.isArray(raw.active) ? raw.active : []).filter(
    (item): item is Challenge => Boolean(item) && isKey(item.key) && isDate(item.start),
  );
  const history = (Array.isArray(raw.history) ? raw.history : []).filter(
    (item): item is ChallengeRecord =>
      Boolean(item) &&
      isKey(item.key) &&
      isDate(item.start) &&
      isDate(item.end) &&
      ["done", "lost"].includes(item.result),
  );
  return { active, history };
}

/** Cómo va un reto con el cumplimiento de cada día (por fecha). */
export function challengeProgress(
  challenge: Challenge,
  compliance: Map<string, DayCompliance>,
  today: string,
): ChallengeProgress {
  const marks: DayMark[] = [];
  const missesByWeek = [0, 0, 0];
  let day = 0;
  for (let index = 0; index < CHALLENGE_DAYS; index++) {
    const date = addDays(challenge.start, index);
    if (date > today) {
      marks.push("pending");
      continue;
    }
    day = index + 1;
    const met = Boolean(compliance.get(date)?.[challenge.key]);
    if (met) marks.push("done");
    else if (date === today) marks.push("today");
    else {
      marks.push("missed");
      missesByWeek[Math.floor(index / 7)] += 1;
    }
  }
  const lost = missesByWeek.some((misses) => misses > MISSES_PER_WEEK);
  const last = addDays(challenge.start, CHALLENGE_DAYS - 1);
  const finished = today > last || (today === last && marks[CHALLENGE_DAYS - 1] === "done");
  return {
    challenge,
    day: Math.max(1, day),
    marks,
    done: marks.filter((mark) => mark === "done").length,
    missed: marks.filter((mark) => mark === "missed").length,
    status: lost ? "lost" : finished ? "done" : "active",
  };
}

/** Empieza un reto hoy. Si ya hay uno activo del mismo compromiso, no hace nada. */
export function startChallenge(state: Challenges, key: ComplianceKey, today: string): Challenges {
  if (state.active.some((item) => item.key === key)) return state;
  return { ...state, active: [...state.active, { key, start: today }] };
}

/** Pasa al historial los retos que terminaron (cumplidos o perdidos). */
export function settleChallenges(
  state: Challenges,
  compliance: Map<string, DayCompliance>,
  today: string,
): Challenges {
  const finished: ChallengeRecord[] = [];
  const active = state.active.filter((challenge) => {
    const progress = challengeProgress(challenge, compliance, today);
    if (progress.status === "active") return true;
    finished.push({
      ...challenge,
      end: progress.status === "done" ? addDays(challenge.start, CHALLENGE_DAYS - 1) : today,
      result: progress.status,
    });
    return false;
  });
  return finished.length ? { active, history: [...finished, ...state.history] } : state;
}
