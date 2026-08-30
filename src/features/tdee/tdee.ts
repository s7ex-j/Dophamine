import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";

// Initial, conservative estimator. It becomes useful after at least 14 daily records.
export function estimateTdee(records: DailyBiometrics[]): number | null {
  if (records.length < 14) return null;
  const ordered = [...records].reverse();
  const firstWeight = ordered[0].weightKg;
  const lastWeight = ordered[ordered.length - 1].weightKg;
  const averageIntake = ordered.reduce((sum, record) => sum + record.caloriesIn, 0) / ordered.length;
  const dailyWeightChangeKg = (lastWeight - firstWeight) / Math.max(ordered.length - 1, 1);
  return Math.round(averageIntake - dailyWeightChangeKg * 7700);
}

