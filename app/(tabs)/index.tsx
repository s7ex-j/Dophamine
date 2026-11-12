import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { Screen } from "@/src/components/ui";
import { ViewerBanner, ViewerEmpty } from "@/src/features/backup/ViewerSections";
import { buildWeek, heroMessageFor, nextStepFor } from "@/src/features/dashboard/dashboard";
import { getDashboardSnapshot, type DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import {
  DashboardHeader,
  EnergyCard,
  EnergyHero,
  HabitsQuickCard,
  MacrosCard,
  NextStepCard,
  TodayMetrics,
  WeekCard,
  type NutritionView,
} from "@/src/features/dashboard/DashboardSections";
import {
  CompositionCard,
  ExpenditureCard,
  GoalProgressCard,
  TrendCard,
} from "@/src/features/dashboard/ProgressSections";
import { DEFAULT_HABITS, dateKey } from "@/src/features/habits/habits";
import { getHabitEntries, toggleHabit, type HabitEntry } from "@/src/features/habits/habits.repository";
import { Onboarding } from "@/src/features/profile/PlanWizard";
import { AutoAdjustBanner, CheckInCard } from "@/src/features/reviews/CheckInSections";
import { useCheckIn } from "@/src/features/reviews/useCheckIn";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

// Pestaña "Panel": el progreso de un vistazo. Carga los datos, decide qué mostrar
// y compone las secciones; los cálculos están en el dominio.
export default function DashboardScreen() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [nutritionView, setNutritionView] = useState<NutritionView>("consumed");

  const load = useCallback(() => {
    Promise.all([getDashboardSnapshot(), getHabitEntries(DEFAULT_HABITS, 31)]).then(
      ([nextSnapshot, nextEntries]) => {
        setSnapshot(nextSnapshot);
        setEntries(nextEntries);
      },
    );
  }, []);
  useEffect(load, [load]);
  useFocusEffect(load);
  const controls = useCheckIn(snapshot, load);

  const todayHabit = (habitId: string) =>
    entries.find((entry) => entry.id === habitId && entry.date === dateKey())?.completed ?? false;
  const toggleToday = async (habitId: string) => {
    await toggleHabit(habitId);
    load();
  };
  const todayScore = useMemo(() => DEFAULT_HABITS.filter((habit) => todayHabit(habit.id)).length, [entries]);

  if (!snapshot) return <Screen />;
  if (!snapshot.profile)
    return VIEWER ? (
      <ViewerEmpty onLoaded={load} />
    ) : (
      <Onboarding profile={null} weightKg={snapshot.weightKg} onSaved={load} />
    );

  const profile = snapshot.profile;
  const today = snapshot.recentRecords.find((record) => record.date === dateKey());
  const calories = today?.caloriesIn ?? 0;
  const remainingCalories = Math.max(0, profile.calorieTarget - calories);
  const week = buildWeek(snapshot.recentRecords);
  const nextStep = nextStepFor(Boolean(today?.caloriesIn), todayScore, DEFAULT_HABITS.length);
  const todaySnapshot: DashboardSnapshot = {
    ...snapshot,
    caloriesIn: today?.caloriesIn ?? null,
    proteinG: today?.proteinG ?? null,
    carbsG: today?.carbsG ?? null,
    fatsG: today?.fatsG ?? null,
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <DashboardHeader profile={profile} openPlan={() => router.push("/strategy")} />
        <EnergyHero
          profile={profile}
          remainingCalories={remainingCalories}
          todayScore={todayScore}
          week={week}
          heroMessage={heroMessageFor(today?.caloriesIn ?? null, profile.calorieTarget)}
        />
        <AutoAdjustBanner snapshot={snapshot} controls={controls} />
        {controls.action === "propose" ? <CheckInCard snapshot={snapshot} controls={controls} /> : null}
        {VIEWER ? (
          <ViewerBanner />
        ) : (
          <NextStepCard nextStep={nextStep} openNextStep={() => router.push(nextStep.route)} />
        )}
        <EnergyCard
          profile={profile}
          calories={calories}
          remainingCalories={remainingCalories}
          nutritionView={nutritionView}
          setNutritionView={setNutritionView}
        />
        <MacrosCard profile={profile} snapshot={todaySnapshot} nutritionView={nutritionView} />
        <TodayMetrics snapshot={todaySnapshot} />
        <GoalProgressCard profile={profile} trendKg={snapshot.trendKg} />
        <TrendCard analysis={snapshot.analysis} profile={profile} />
        <ExpenditureCard analysis={snapshot.analysis} />
        <CompositionCard records={snapshot.records} profile={profile} />
        <WeekCard profile={profile} week={week} />
        {VIEWER ? null : <HabitsQuickCard todayHabit={todayHabit} toggleToday={toggleToday} />}
      </ScrollView>
    </Screen>
  );
}
