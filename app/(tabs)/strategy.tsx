import { useCallback, useState } from "react";
import { ScreenSkeleton } from "@/src/components/Skeleton";
import { ScrollView, View } from "react-native";
import { Text } from "@/src/components/Text";
import { useFocusEffect, useRouter } from "expo-router";

import { Button, Card, ListRow, NavRow, Screen, WideColumns } from "@/src/components/ui";
import { getDashboardSnapshot, type DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { DRAFT_KEY, Onboarding } from "@/src/features/profile/PlanWizard";
import { DistributionCard } from "@/src/features/profile/DistributionCard";
import { StrategyHeader } from "@/src/features/profile/StrategyHeader";
import { DIET_TYPES } from "@/src/features/profile/targets";
import { activityLabels, goalLabels } from "@/src/features/profile/profile";
import { AutoAdjustBanner, CheckInCard, ReviewHistoryCard } from "@/src/features/reviews/CheckInSections";
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
      <ScrollView contentContainerStyle={AppTheme.content}>
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
          <ReviewHistoryCard reviews={reviews} />
          <View style={[AppTheme.card, { paddingVertical: 2 }]}>
            <NavRow
              title="Cómo se calcula"
              detail="El motor por dentro, con tus números"
              onPress={() => router.push("/algorithm")}
            />
            <NavRow
              title="Análisis"
              detail="Tendencia, ingesta y adherencia de las últimas semanas"
              onPress={() => router.push("/analysis")}
            />
          </View>
          <Card title="Tu plan">
            <ListRow
              title="Tipo de plan"
              detail="Cómo se reparten carbohidratos y grasas"
              value={DIET_TYPES.find((item) => item.value === (profile.dietType ?? "balanced"))?.label}
            />
            <ListRow
              title="Actividad"
              detail="Nivel declarado en tu evaluación"
              value={activityLabels[profile.activity]}
            />
            {VIEWER ? null : (
              <Button title="Reevaluar mi plan" variant="secondary" onPress={() => setEditing(true)} />
            )}
            <Text style={AppTheme.hint}>
              Repite las preguntas de la evaluación inicial. Tus registros no se borran.
            </Text>
          </Card>
        </WideColumns>
      </ScrollView>
    </Screen>
  );
}
