import { getDashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { lastAutoBackup } from "@/src/features/backup/backup.repository";
import { CHALLENGES_KEY, readChallenges } from "@/src/features/challenges/challenges";
import { getDiet, getHealth } from "@/src/features/diet/diet.repository";
import { getComplianceDays } from "@/src/features/habits/compliance.data";
import { MEASUREMENTS_KEY, readMeasurements } from "@/src/features/measurements/measurements";
import {
  agoLabel,
  habitsTile,
  measurementsTile,
  streakTile,
  wellbeingTile,
  type TileText,
} from "@/src/features/more/more";
import { goalLabels, goalProgress, weightUnitOf } from "@/src/features/profile/profile";
import { REMINDERS_KEY } from "@/src/features/reminders/reminders";
import { getSetting } from "@/src/features/settings/settings.repository";
import { getStreakSummary } from "@/src/features/streak/streak.data";
import { getRecentWellbeingEntries } from "@/src/features/wellbeing/wellbeing.repository";
import { localDateKey } from "@/src/lib/dates";
import { formatWeight, weightValue } from "@/src/lib/units";

export type MoreSummary = {
  plan: { goal: string; detail: string; percent: number | null } | null;
  habits: TileText;
  wellbeing: TileText;
  streak: TileText;
  measurements: TileText;
  diet: string;
  health: string;
  challenge: string;
  backup: string;
  reminders: string;
};

/** Junta lo que Más muestra de un vistazo. Solo lee. */
export async function getMoreSummary(): Promise<MoreSummary> {
  const today = localDateKey();
  const [snapshot, days, moods, streak, measurements, diet, health, challenges, backup, reminders] =
    await Promise.all([
      getDashboardSnapshot(),
      getComplianceDays(1),
      getRecentWellbeingEntries(1),
      getStreakSummary(),
      getSetting(MEASUREMENTS_KEY),
      getDiet(),
      getHealth(),
      getSetting(CHALLENGES_KEY),
      lastAutoBackup(),
      getSetting(REMINDERS_KEY),
    ]);
  const { profile, trendKg } = snapshot;
  const unit = profile ? weightUnitOf(profile) : "kg";
  const progress = profile ? goalProgress(profile, trendKg) : null;
  const mood = moods[0]?.date === today ? moods[0].mood : null;
  const limits = health.avoid.length + health.conditions.length;
  const active = readChallenges(challenges).active.length;
  return {
    plan: profile
      ? {
          goal: goalLabels[profile.goal],
          detail: progress
            ? progress.reached
              ? "Meta alcanzada"
              : `${weightValue(progress.currentKg, unit, 1)} → ${formatWeight(progress.goalKg, unit, 1)}, faltan ${weightValue(progress.remainingKg, unit, 1)}`
            : `${profile.calorieTarget} kcal al día`,
          percent: progress?.percent ?? null,
        }
      : null,
    habits: habitsTile(days[0]?.compliance ?? null),
    wellbeing: wellbeingTile(mood),
    streak: streakTile(streak.current, streak.best),
    measurements: measurementsTile(readMeasurements(measurements)),
    diet: diet ? "Cargada" : "",
    health: limits ? String(limits) : "",
    challenge: active ? `${active} en curso` : "",
    backup: agoLabel(backup, today),
    reminders: (reminders as { enabled?: boolean } | null)?.enabled ? "Encendidos" : "",
  };
}
