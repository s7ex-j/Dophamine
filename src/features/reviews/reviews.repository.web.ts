import { readStore, webId, webToday, writeStore } from "@/src/db/web-storage";
import type { ReviewDecision, WeeklyReview, WeeklyReviewInput } from "@/src/features/reviews/reviews";

export async function saveWeeklyReview(input: WeeklyReviewInput, date = webToday()) {
  const store = readStore();
  store.reviews = [{ id: webId(), date, ...input }, ...(store.reviews ?? [])];
  writeStore(store);
}

/** Las revisiones más recientes primero. */
export async function getWeeklyReviews(limit = 12): Promise<WeeklyReview[]> {
  return [...(readStore().reviews ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

export async function setReviewDecision(reviewId: string, decision: ReviewDecision) {
  const store = readStore();
  store.reviews = (store.reviews ?? []).map((review) =>
    review.id === reviewId ? { ...review, decision } : review,
  );
  writeStore(store);
}
