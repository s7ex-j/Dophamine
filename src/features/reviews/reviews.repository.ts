import { getDatabase } from "@/src/db/database";
import { localDateKey } from "@/src/lib/dates";
import type { ReviewDecision, WeeklyReview, WeeklyReviewInput } from "@/src/features/reviews/reviews";

const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export async function saveWeeklyReview(input: WeeklyReviewInput, date = localDateKey()) {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT INTO weekly_reviews (id, date, decision, previous_calories, suggested_calories, tdee) VALUES (?, ?, ?, ?, ?, ?)",
    id(),
    date,
    input.decision,
    input.previousCalories,
    input.suggestedCalories,
    input.tdee,
  );
}

/** Las revisiones más recientes primero. */
export async function getWeeklyReviews(limit = 12): Promise<WeeklyReview[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    date: string;
    decision: ReviewDecision;
    previous_calories: number;
    suggested_calories: number;
    tdee: number | null;
  }>("SELECT * FROM weekly_reviews ORDER BY date DESC, rowid DESC LIMIT ?", limit);
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    decision: row.decision,
    previousCalories: row.previous_calories,
    suggestedCalories: row.suggested_calories,
    tdee: row.tdee,
  }));
}
