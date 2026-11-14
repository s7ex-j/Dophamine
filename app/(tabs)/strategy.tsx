import { useCallback, useState } from "react";
import { ScrollView, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { Button, Card, ListRow, NavRow, Screen } from "@/src/components/ui";
import { getDashboardSnapshot, type DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { ExpenditureCard, GoalProgressCard } from "@/src/features/dashboard/ProgressSections";
import { Onboarding } from "@/src/features/profile/PlanWizard";
import { DistributionCard } from "@/src/features/profile/DistributionCard";
import {
  activityLabels,
  adjustModeLabels,
  adjustModeOf,
  checkInDaysOf,
  goalLabels,
} from "@/src/features/profile/profile";
import { AutoAdjustBanner, CheckInCard, ReviewHistoryCard } from "@/src/features/reviews/CheckInSections";
import type { WeeklyReview } from "@/src/features/reviews/reviews";
import { getWeeklyReviews } from "@/src/features/reviews/reviews.repository";
import { useCheckIn } from "@/src/features/reviews/useCheckIn";
import { ViewerEmpty } from "@/src/features/backup/ViewerSections";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

// Pestaña "Estrategia": el plan vigente, la revisión periódica y su historial.
export default function StrategyScreen() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [editing, setEditing] = useState(false);
  const load = useCallback(() => {
    Promise.all([getDashboardSnapshot(), getWeeklyReviews()]).then(([nextSnapshot, nextReviews]) => {
      setSnapshot(nextSnapshot);
      setReviews(nextReviews);
    });
  }, []);
  useFocusEffect(load);
  const controls = useCheckIn(snapshot, load);

  if (!snapshot) return <Screen />;
  const profile = snapshot.profile;
  if (!profile && VIEWER) return <ViewerEmpty onLoaded={load} />;
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
        <Text style={AppTheme.eyebrow}>ESTRATEGIA</Text>
        <Text style={AppTheme.title}>Tu programa</Text>
        <AutoAdjustBanner snapshot={snapshot} controls={controls} />
        <Card title={`${goalLabels[profile.goal]} · ${profile.calorieTarget} kcal`}>
          <ListRow
            title="Macros diarios"
            detail={`Proteína ${profile.proteinTarget} g · Carbohidratos ${profile.carbsTarget} g · Grasas ${profile.fatsTarget} g`}
          />
          <ListRow
            title="Ajustes del objetivo"
            detail={`Revisión cada ${checkInDaysOf(profile)} días`}
            value={adjustModeLabels[adjustModeOf(profile)]}
          />
          <ListRow
            title="Actividad"
            detail="Nivel declarado en tu evaluación"
            value={activityLabels[profile.activity]}
          />
          {VIEWER ? null : (
            <Button title="Editar plan" variant="secondary" onPress={() => setEditing(true)} />
          )}
        </Card>
        {VIEWER ? null : <DistributionCard profile={profile} onChanged={load} />}
        <CheckInCard snapshot={snapshot} controls={controls} />
        <GoalProgressCard
          profile={profile}
          trendKg={snapshot.trendKg}
          weeklyRateKg={snapshot.analysis.weeklyRateKg}
        />
        <ExpenditureCard analysis={snapshot.analysis} />
        <ReviewHistoryCard reviews={reviews} />
        <Card title="Más detalle">
          <NavRow
            title="Cómo se calcula"
            detail="El algoritmo paso a paso, con tus números"
            onPress={() => router.push("/algorithm")}
          />
          <NavRow
            title="Análisis"
            detail="Tendencia, ingesta y adherencia de las últimas semanas"
            onPress={() => router.push("/analysis")}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}
