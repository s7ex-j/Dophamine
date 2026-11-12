import { addDays, localDateKey } from "@/src/lib/dates";

/**
 * Historial de revisiones semanales: cada propuesta de ajuste calórico que la
 * persona aceptó o decidió no aplicar. Este módulo es puro; guardar y leer es
 * trabajo de `reviews.repository` (una variante por plataforma).
 */
// "auto": la app aplicó el ajuste sola (modo automático). Si se deshace, pasa a "dismissed".
export type ReviewDecision = "accepted" | "dismissed" | "auto";
export type WeeklyReview = {
  id: string;
  date: string;
  decision: ReviewDecision;
  previousCalories: number;
  suggestedCalories: number;
  tdee: number | null;
};
export type WeeklyReviewInput = Omit<WeeklyReview, "id" | "date">;

export const REVIEW_INTERVAL_DAYS = 7;

/** Día desde el que se puede volver a proponer un ajuste, o null si nunca hubo revisión. */
export const nextReviewDate = (
  last: Pick<WeeklyReview, "date"> | null,
  intervalDays: number = REVIEW_INTERVAL_DAYS,
) => (last ? addDays(last.date, intervalDays) : null);

/** Una revisión por intervalo (3 o 7 días): después de responder una, la siguiente espera. */
export function isReviewDue(
  last: Pick<WeeklyReview, "date"> | null,
  today = localDateKey(),
  intervalDays: number = REVIEW_INTERVAL_DAYS,
): boolean {
  const next = nextReviewDate(last, intervalDays);
  return next === null || today >= next;
}

export type CheckInAction = "none" | "inform" | "propose" | "auto";

/**
 * Qué hacer con la revisión de hoy según el modo de ajuste:
 * automático aplica el cambio, colaborativo lo propone y manual solo informa.
 * Sin propuesta lista, o si aún no toca revisión, no se hace nada.
 */
export function checkInAction(
  checkIn: { ready: boolean; delta: number | null } | null,
  due: boolean,
  mode: "auto" | "collaborative" | "manual",
): CheckInAction {
  if (!checkIn?.ready || !checkIn.delta || Math.abs(checkIn.delta) < 25) return "none";
  if (mode === "manual") return "inform";
  if (!due) return "none";
  return mode === "auto" ? "auto" : "propose";
}

/** El último ajuste automático se puede deshacer mientras no llegue la siguiente revisión. */
export const canUndoAuto = (
  last: Pick<WeeklyReview, "date" | "decision"> | null,
  today = localDateKey(),
  intervalDays: number = REVIEW_INTERVAL_DAYS,
) => last?.decision === "auto" && !isReviewDue(last, today, intervalDays);

/** Texto de una revisión para la lista del historial. */
export function describeReview(review: WeeklyReview): { title: string; detail: string; value: string } {
  const delta = review.suggestedCalories - review.previousCalories;
  const change = `${delta > 0 ? "+" : ""}${delta} kcal`;
  const tdee = review.tdee ? ` · TDEE estimado ${review.tdee} kcal` : "";
  return review.decision !== "dismissed"
    ? {
        title: review.decision === "auto" ? "Ajuste automático" : "Ajuste aceptado",
        detail: `${review.date} · ${review.previousCalories} → ${review.suggestedCalories} kcal${tdee}`,
        value: change,
      }
    : {
        title: "Propuesta descartada",
        detail: `${review.date} · se mantuvo ${review.previousCalories} kcal (propuesta: ${change})${tdee}`,
        value: "Sin cambio",
      };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Comprueba la forma de una revisión leída de un respaldo. */
export function isWeeklyReview(value: unknown): value is WeeklyReview {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    (value.decision === "accepted" || value.decision === "dismissed" || value.decision === "auto") &&
    Number.isFinite(value.previousCalories) &&
    Number.isFinite(value.suggestedCalories)
  );
}
