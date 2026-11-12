import { localDateKey } from "@/src/lib/dates";

/**
 * Historial de revisiones semanales: cada propuesta de ajuste calórico que la
 * persona aceptó o decidió no aplicar. Este módulo es puro; guardar y leer es
 * trabajo de `reviews.repository` (una variante por plataforma).
 */
export type ReviewDecision = "accepted" | "dismissed";
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

/** Suma días a una clave AAAA-MM-DD con el calendario local. */
export function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return localDateKey(new Date(year, month - 1, day + days));
}

/** Día desde el que se puede volver a proponer un ajuste, o null si nunca hubo revisión. */
export const nextReviewDate = (last: Pick<WeeklyReview, "date"> | null) =>
  last ? addDays(last.date, REVIEW_INTERVAL_DAYS) : null;

/** Una propuesta por semana: después de responder una, la siguiente espera siete días. */
export function isReviewDue(last: Pick<WeeklyReview, "date"> | null, today = localDateKey()): boolean {
  const next = nextReviewDate(last);
  return next === null || today >= next;
}

/** Texto de una revisión para la lista del historial. */
export function describeReview(review: WeeklyReview): { title: string; detail: string; value: string } {
  const delta = review.suggestedCalories - review.previousCalories;
  const change = `${delta > 0 ? "+" : ""}${delta} kcal`;
  const tdee = review.tdee ? ` · TDEE estimado ${review.tdee} kcal` : "";
  return review.decision === "accepted"
    ? {
        title: "Ajuste aceptado",
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
    (value.decision === "accepted" || value.decision === "dismissed") &&
    Number.isFinite(value.previousCalories) &&
    Number.isFinite(value.suggestedCalories)
  );
}
