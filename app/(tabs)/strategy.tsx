import { useCallback, useState } from "react";
import { ScreenSkeleton } from "@/src/components/Skeleton";
import { TitledScroll } from "@/src/components/TitledScroll";
import { MoreControl, MoreDisclosure, MoreGroup, MoreRow } from "@/src/features/more/MoreSections";
import { Text } from "@/src/components/Text";
import { useFocusEffect, useRouter } from "expo-router";

import { Screen, WideColumns } from "@/src/components/ui";
import { getDashboardSnapshot, type DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { DRAFT_KEY, Onboarding } from "@/src/features/profile/PlanWizard";
import { DistributionCard } from "@/src/features/profile/DistributionCard";
import { StrategyHeader } from "@/src/features/profile/StrategyHeader";
import { DIET_TYPES } from "@/src/features/profile/targets";
import { activityLabels, adjustModeLabels, adjustModeOf, goalLabels } from "@/src/features/profile/profile";
import { AutoAdjustBanner, CheckInCard, ReviewList } from "@/src/features/reviews/CheckInSections";
import type { WeeklyReview } from "@/src/features/reviews/reviews";
import { getWeeklyReviews } from "@/src/features/reviews/reviews.repository";
import { GOAL_DATE_KEY, readGoalDate, type GoalDate } from "@/src/features/goals/goalDate";
import { saveNutritionProfile } from "@/src/features/profile/profile.repository";
import { getSetting } from "@/src/features/settings/settings.repository";
import { useCheckIn } from "@/src/features/reviews/useCheckIn";
import { ViewerEmpty } from "@/src/features/backup/ViewerSections";
import { useViewerHasData } from "@/src/features/backup/viewerData";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

// Pestaña "Estrategia": el plan vigente, la revisión periódica y su historial.
export default function StrategyScreen() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [editing, setEditing] = useState(false);
  const [goalDate, setGoalDate] = useState<GoalDate | null>(null);
  const load = useCallback(() => {
    Promise.all([getDashboardSnapshot(), getWeeklyReviews(), getSetting(GOAL_DATE_KEY)]).then(
      ([nextSnapshot, nextReviews, savedGoal]) => {
        setSnapshot(nextSnapshot);
        setReviews(nextReviews);
        setGoalDate(readGoalDate(savedGoal));
        getSetting(DRAFT_KEY).then((draft) => draft && setEditing(true));
      },
    );
  }, []);
  useFocusEffect(load);
  const controls = useCheckIn(snapshot, load);
  const viewerOpen = useViewerHasData(VIEWER);

  if (!snapshot) return <ScreenSkeleton blocks={[220, 160, 260]} />;
  const profile = snapshot.profile;
  if (VIEWER && (!profile || viewerOpen === false)) return <ViewerEmpty onLoaded={load} />;
  if (!profile || editing)
    return (
      <Onboarding
        profile={profile}
        weightKg={snapshot.weightKg}
        onCancel={profile ? () => setEditing(false) : undefined}
        onSaved={() => {
          setEditing(false);
          load();
        }}
      />
    );

  return (
    <Screen>
      <TitledScroll title="Estrategia" context={goalLabels[profile.goal]}>
        <StrategyHeader
          profile={profile}
          trendKg={snapshot.trendKg ?? snapshot.weightKg}
          analysis={snapshot.analysis}
          goalDate={goalDate}
          onApplyCalories={async (delta) => {
            await saveNutritionProfile({ ...profile, calorieTarget: profile.calorieTarget + delta });
            load();
          }}
        />
        <AutoAdjustBanner snapshot={snapshot} controls={controls} />
        <WideColumns>
          <CheckInCard snapshot={snapshot} controls={controls} />
          <DistributionCard profile={profile} />
          <MoreGroup title="Tu plan">
            <MoreControl icon="pie-chart-outline" title="Tipo de plan">
              <Text style={AppTheme.hint}>
                {DIET_TYPES.find((item) => item.value === (profile.dietType ?? "balanced"))?.label}
              </Text>
            </MoreControl>
            <MoreControl icon="walk-outline" title="Actividad">
              <Text style={AppTheme.hint}>{activityLabels[profile.activity]}</Text>
            </MoreControl>
            <MoreControl icon="options-outline" title="Modo de ajuste">
              <Text style={AppTheme.hint}>{adjustModeLabels[adjustModeOf(profile)]}</Text>
            </MoreControl>
            {VIEWER ? null : (
              <MoreRow icon="refresh-outline" title="Reevaluar mi plan" onPress={() => setEditing(true)} />
            )}
          </MoreGroup>
          <MoreGroup title="Entender">
            <MoreRow
              icon="git-network-outline"
              title="Cómo se calcula"
              onPress={() => router.push("/algorithm")}
            />
            <MoreRow icon="analytics-outline" title="Análisis" onPress={() => router.push("/analysis")} />
            <MoreDisclosure icon="time-outline" title="Historial de revisiones">
              <ReviewList reviews={reviews} />
            </MoreDisclosure>
          </MoreGroup>
        </WideColumns>
      </TitledScroll>
    </Screen>
  );
}
